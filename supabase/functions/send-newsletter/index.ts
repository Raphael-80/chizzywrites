import { createClient } from "npm:@supabase/supabase-js@2";
import { createUnsubscribeToken } from "../_shared/unsubscribe.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
        },
    });

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return jsonResponse({ error: "Method not allowed." }, 405);
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const adminUserId = Deno.env.get("CHIZZY_ADMIN_USER_ID");
        const brevoApiKey = Deno.env.get("BREVO_API_KEY");
        const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
        const senderName =
            Deno.env.get("BREVO_SENDER_NAME") || "ChizzyWrites";
        const siteUrl = Deno.env.get("SITE_URL");
        const unsubscribeSecret = Deno.env.get("UNSUBSCRIBE_SECRET");

        if (
            !supabaseUrl ||
            !supabaseAnonKey ||
            !serviceRoleKey ||
            !adminUserId ||
            !brevoApiKey ||
            !senderEmail ||
            !siteUrl ||
            !unsubscribeSecret
        ) {
            console.error("One or more required function secrets are missing.");

            return jsonResponse(
                { error: "The newsletter service is not fully configured." },
                500
            );
        }

        // Authenticate the caller.
        const authorization = req.headers.get("Authorization");

        if (!authorization?.startsWith("Bearer ")) {
            return jsonResponse({ error: "Authentication required." }, 401);
        }

        const accessToken = authorization.slice("Bearer ".length);

        const authClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });

        const {
            data: { user },
            error: authError,
        } = await authClient.auth.getUser(accessToken);

        if (authError || !user || user.id !== adminUserId) {
            return jsonResponse({ error: "Admin access required." }, 403);
        }

        const body = await req.json();

        const subject =
            typeof body.subject === "string" ? body.subject.trim() : "";

        const htmlContent =
            typeof body.htmlContent === "string"
                ? body.htmlContent.trim()
                : "";

        // Only the literal boolean true activates test mode.
        const testMode = body.testMode === true;

        if (!subject || !htmlContent) {
            return jsonResponse(
                { error: "Subject and newsletter content are required." },
                400
            );
        }

        if (subject.length > 200 || htmlContent.length > 200_000) {
            return jsonResponse(
                { error: "The subject or newsletter content is too long." },
                400
            );
        }

        const serviceClient = createClient(
            supabaseUrl,
            serviceRoleKey,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                },
            }
        );

        // TEST MODE: send only to the authenticated admin's email.
        // Do not query subscribers or create subscriber unsubscribe links.
        if (testMode) {
            if (!user.email) {
                return jsonResponse(
                    { error: "Your admin account has no email address." },
                    400
                );
            }

            const testHtml = `
                <div style="padding:12px;margin-bottom:20px;border:1px solid #d97706;background:#fffbeb;color:#92400e;font-family:Arial,sans-serif;">
                    <strong>TEST EMAIL</strong>
                    <p style="margin-bottom:0;">
                        This is a preview sent to the administrator only.
                        It has not been sent to newsletter subscribers.
                    </p>
                </div>
                ${htmlContent}
            `;

            const brevoResponse = await fetch(
                "https://api.brevo.com/v3/smtp/email",
                {
                    method: "POST",
                    headers: {
                        "api-key": brevoApiKey,
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        sender: {
                            email: senderEmail,
                            name: senderName,
                        },
                        to: [{ email: user.email }],
                        subject: `[TEST] ${subject}`,
                        htmlContent: testHtml,
                    }),
                }
            );

            if (!brevoResponse.ok) {
                const errorText = await brevoResponse.text();
                console.error("Brevo test email failed:", errorText);

                return jsonResponse(
                    { error: "Brevo could not send the test email." },
                    502
                );
            }

            return jsonResponse({
                success: true,
                testMode: true,
                message: `Test email sent to ${user.email}. No subscribers were emailed.`,
            });
        }

        // CAMPAIGN MODE: fetch active subscribers only.
        const { data: subscribers, error: subscribersError } =
            await serviceClient
                .from("subscribers")
                .select("id, email")
                .eq("status", "active");

        if (subscribersError) {
            console.error(
                "Failed to load active subscribers:",
                subscribersError
            );

            return jsonResponse(
                { error: "Could not load active subscribers." },
                500
            );
        }

        if (!subscribers?.length) {
            return jsonResponse(
                { error: "There are no active subscribers to email." },
                400
            );
        }

        let sent = 0;
        let failed = 0;

        for (const subscriber of subscribers) {
            try {
                const token = await createUnsubscribeToken(
                    subscriber.id,
                    unsubscribeSecret
                );

                const unsubscribeUrl = new URL(
                    "/unsubscribe",
                    siteUrl
                );

                unsubscribeUrl.searchParams.set(
                    "subscriberId",
                    subscriber.id
                );

                unsubscribeUrl.searchParams.set("token", token);

                const campaignHtml = `
                    ${htmlContent}
                    <hr style="margin-top:32px;border:none;border-top:1px solid #ddd;" />
                    <p style="font-family:Arial,sans-serif;font-size:12px;color:#666;">
                        You are receiving this email because you subscribed
                        to the ChizzyWrites newsletter.
                        <a href="${unsubscribeUrl.toString()}">
                            Unsubscribe
                        </a>
                    </p>
                `;

                const brevoResponse = await fetch(
                    "https://api.brevo.com/v3/smtp/email",
                    {
                        method: "POST",
                        headers: {
                            "api-key": brevoApiKey,
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        },
                        body: JSON.stringify({
                            sender: {
                                email: senderEmail,
                                name: senderName,
                            },
                            to: [{ email: subscriber.email }],
                            subject,
                            htmlContent: campaignHtml,
                        }),
                    }
                );

                if (!brevoResponse.ok) {
                    const errorText = await brevoResponse.text();

                    console.error(
                        `Newsletter delivery failed for subscriber ${subscriber.id}:`,
                        errorText
                    );

                    failed++;
                } else {
                    sent++;
                }
            } catch (error) {
                console.error(
                    `Newsletter processing failed for subscriber ${subscriber.id}:`,
                    error
                );

                failed++;
            }
        }

        return jsonResponse({
            success: failed === 0,
            testMode: false,
            total: subscribers.length,
            sent,
            failed,
            message: `Campaign finished. Sent: ${sent}. Failed: ${failed}.`,
        });
    } catch (error) {
        console.error("Newsletter function error:", error);

        return jsonResponse(
            { error: "An unexpected newsletter error occurred." },
            500
        );
    }
});