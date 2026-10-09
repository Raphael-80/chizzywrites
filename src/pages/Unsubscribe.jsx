import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Unsubscribe() {
    const [searchParams] = useSearchParams();
    const subscriberId = searchParams.get("subscriberId");
    const token = searchParams.get("token");

    const [status, setStatus] = useState("idle");
    const [message, setMessage] = useState("");

    const handleUnsubscribe = async () => {
        if (!subscriberId || !token) {
            setStatus("error");
            setMessage("This unsubscribe link is incomplete. Please check the link in your email");
            return;
        }

        setStatus("loading");
        setMessage("");

        try {
            const { data, error } = await supabase.functions.invoke(
                "unsubscribe",
                {
                    body: { subscriberId, token },
                }
            );

            if (error) {
                throw error;
            }

            if (data?.error) {
                throw new Error(data.error)
            }

            setStatus("success");
            setMessage(
                data?.message || "You have successfully unsubscribed from ChizzyWrites newsletters."
            );
        } catch (error) {
            console.error("Unsubscribe error:", error);
            setStatus("error");
            setMessage(
                error.message || "We couldn't process your request. Please try again later."
            );
        }
    }

    const hasValidLink = Boolean(subscriberId && token);

    return (
        <main className="min-h-screen bg-[#f8f6f1] px-5 py-16 text-[#171717]">
            <div className="mx-auto flex min-h-[65vh] max-w-xl items-center justify-center">
                <section className="w-full rounded-2xl border border-black/10 bg-white p-7 text-center shadow-sm sm:p-10">
                    <Link to="/" className="mb-8 inline-block font-serif text-2xl font-bold tracking-tight">
                        ChizzyWrites
                    </Link>
                    {
                        status === "success" ? (
                            <>
                                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">
                                    ✓
                                </div>

                                <h1 className="mb-3 font-serif text-3xl font-bold">
                                    Unsubscribed Successfully
                                </h1>

                                <p className="text-sm leading-7 text-gray-600">
                                    {message}
                                </p>
                            </>
                        ) : (
                            <>
                                <h1 className="mb-3 font-serif text-3xl font-bold">
                                    Unsubscribe from our newsletter
                                </h1>

                                <p className="mb-7 text-sm leading-7 text-gray-600">
                                    We're sorry to see you go. If you unsubscribe, you will no longer receive ChizzyWrites newsletter emails.
                                </p>

                                {
                                    message && (
                                        <p className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
                                            {message}
                                        </p>
                                    )
                                }

                                {
                                    !hasValidLink ? (
                                        <p className="mb-6 text-sm text-red-700">
                                            This link is incomplete or invalid. Please use the unsubscribe link in your email.
                                        </p>
                                    ) : (
                                        <button type="button" onClick={handleUnsubscribe} disabled={status === "loading"} className="w-full rounded-lg bg-[#171717] px-6 py-3 font-medium text-white transition hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
                                            {
                                                status === "loading" ? "Unsubscribing..." : "Confirm Unsubscribe"
                                            }
                                        </button>
                                    )
                                }
                            </>
                        )
                    }

                    <Link to="/" className="mt-8 inline-block text-sm font-medium text-[#b7791f] hover:underline">
                        Return to ChizzyWrites
                    </Link>
                </section>
            </div>
        </main >
    )
}