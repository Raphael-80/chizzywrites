import { useEffect, useState } from "react";
import {
    FaUsers,
    FaUserCheck,
    FaUserTimes,
    FaSignOutAlt,
    FaPaperPlane,
    FaEnvelope,
} from "react-icons/fa";
import { supabase } from "../../lib/supabase";

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        unsubscribed: 0,
    });

    const [subscribers, setSubscribers] = useState([]);
    const [loadingSubscribers, setLoadingSubscribers] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const subscribersPerPage = 10;

    // Newsletter state
    const [newsletterSubject, setNewsletterSubject] = useState("");
    const [newsletterContent, setNewsletterContent] = useState("");
    const [sendingNewsletter, setSendingNewsletter] = useState(false);
    const [newsletterMode, setNewsletterMode] = useState("test");
    const [newsletterMessage, setNewsletterMessage] = useState("");

    // Search and filter subscribers
    const filteredSubscribers = subscribers.filter((subscriber) => {
        const matchesSearch = subscriber.email
            .toLowerCase()
            .includes(searchTerm.toLowerCase().trim());

        const matchesStatus =
            statusFilter === "all" ||
            subscriber.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Pagination
    const totalPages = Math.max(
        1,
        Math.ceil(filteredSubscribers.length / subscribersPerPage)
    );

    const startIndex = (currentPage - 1) * subscribersPerPage;

    const paginatedSubscribers = filteredSubscribers.slice(
        startIndex,
        startIndex + subscribersPerPage
    );

    // Logout
    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error("Error logging out:", error);
            alert("Failed to log out. Please try again.");
            return;
        }

        window.location.href = "/admin/login";
    };

    // Delete subscriber
    const handleDeleteSubscriber = async (subscriber) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete ${subscriber.email}? This action cannot be undone.`
        );

        if (!confirmed) return;

        const { error } = await supabase
            .from("subscribers")
            .delete()
            .eq("id", subscriber.id);

        if (error) {
            console.error("Error deleting subscriber:", error);
            alert("Failed to delete subscriber. Please try again.");
            return;
        }

        setSubscribers((current) =>
            current.filter((item) => item.id !== subscriber.id)
        );

        setStats((current) => ({
            total: current.total - 1,
            active:
                current.active -
                (subscriber.status === "active" ? 1 : 0),
            unsubscribed:
                current.unsubscribed -
                (subscriber.status === "unsubscribed" ? 1 : 0),
        }));
    };

    // Unsubscribe or reactivate subscriber
    const handleToggleStatus = async (subscriber) => {
        const newStatus =
            subscriber.status === "active" ? "unsubscribed" : "active";

        const { error } = await supabase
            .from("subscribers")
            .update({ status: newStatus })
            .eq("id", subscriber.id);

        if (error) {
            console.error("Error updating subscriber status:", error);
            alert("Failed to update subscriber status. Please try again.");
            return;
        }

        setSubscribers((current) =>
            current.map((item) =>
                item.id === subscriber.id
                    ? { ...item, status: newStatus }
                    : item
            )
        );

        setStats((current) => ({
            ...current,
            active: current.active + (newStatus === "active" ? 1 : -1),
            unsubscribed:
                current.unsubscribed +
                (newStatus === "unsubscribed" ? 1 : -1),
        }));
    };

    // Export filtered subscribers to CSV
    const handleExportCSV = () => {
        if (filteredSubscribers.length === 0) {
            alert("There are no subscribers to export.");
            return;
        }

        const headers = ["Email", "Status", "Subscribed At"];

        const escapeCSV = (value) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`;

        const rows = filteredSubscribers.map((subscriber) => [
            subscriber.email,
            subscriber.status,
            subscriber.subscribed_at
                ? new Date(subscriber.subscribed_at).toLocaleString()
                : "",
        ]);

        const csvContent = [
            headers.map(escapeCSV).join(","),
            ...rows.map((row) => row.map(escapeCSV).join(",")),
        ].join("\r\n");

        const blob = new Blob(["\uFEFF", csvContent], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `chizzywrites-subscribers-${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    };

    // Send a test email or a newsletter campaign
    const handleSendNewsletter = async (event) => {
        event.preventDefault();
        setNewsletterMessage("");

        if (!newsletterSubject.trim() || !newsletterContent.trim()) {
            setNewsletterMessage(
                "Please enter both a subject and newsletter content."
            );
            return;
        }

        const isTest = newsletterMode === "test";

        const confirmed = window.confirm(
            isTest
                ? "Send a TEST email to the email address of your currently logged-in admin account? No subscribers should receive this test."
                : `Send this newsletter to all ${stats.active} active subscribers? This cannot be undone.`
        );

        if (!confirmed) return;

        setSendingNewsletter(true);

        try {
            // Ensure the admin has an active session.
            const {
                data: { session },
                error: sessionError,
            } = await supabase.auth.getSession();

            if (sessionError) throw sessionError;

            if (!session?.access_token) {
                throw new Error(
                    "Your admin session has expired. Please log in again."
                );
            }

            const { data, error } = await supabase.functions.invoke(
                "send-newsletter",
                {
                    body: {
                        subject: newsletterSubject.trim(),
                        htmlContent: newsletterContent.trim(),
                        testMode: isTest,
                    },
                }
            );

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            if (isTest) {
                setNewsletterMessage(
                    data?.message ||
                        "Test email request completed. Check the admin inbox and your Supabase function logs."
                );
            } else {
                setNewsletterMessage(
                    `Campaign completed. Sent: ${data?.sent ?? 0}. Failed: ${data?.failed ?? 0}.`
                );
            }

            // Keep the draft available after a test.
            // Clear it only after a successful full campaign.
            if (!isTest) {
                setNewsletterSubject("");
                setNewsletterContent("");
            }
        } catch (error) {
            console.error("Newsletter sending failed:", error);

            setNewsletterMessage(
                error.message ||
                    "Failed to send the newsletter. Please try again."
            );
        } finally {
            setSendingNewsletter(false);
        }
    };

    // Fetch subscribers from Supabase
    useEffect(() => {
        const fetchSubscribers = async () => {
            setLoadingSubscribers(true);

            const { data, error } = await supabase
                .from("subscribers")
                .select("id, email, status, subscribed_at")
                .order("subscribed_at", { ascending: false });

            if (error) {
                console.error("Error fetching subscribers:", error);
                setLoadingSubscribers(false);
                return;
            }

            const subscriberData = data || [];

            setSubscribers(subscriberData);

            setStats({
                total: subscriberData.length,
                active: subscriberData.filter(
                    (subscriber) => subscriber.status === "active"
                ).length,
                unsubscribed: subscriberData.filter(
                    (subscriber) => subscriber.status === "unsubscribed"
                ).length,
            });

            setLoadingSubscribers(false);
        };

        fetchSubscribers();
    }, []);

    // Keep pagination within the available range
    useEffect(() => {
        const lastPage = Math.max(
            1,
            Math.ceil(filteredSubscribers.length / subscribersPerPage)
        );

        if (currentPage > lastPage) {
            setCurrentPage(lastPage);
        }
    }, [filteredSubscribers.length, currentPage]);

    return (
        <div className="min-h-screen bg-chizzy-paper text-chizzy-ink dark:bg-chizzy-dark dark:text-chizzy-white">
            {/* Header */}
            <header className="border-b border-black/10 dark:border-white/10">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            ChizzyWrites
                        </p>
                        <h1 className="text-2xl font-bold">
                            Admin Dashboard
                        </h1>
                    </div>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-2 rounded-lg border border-black/10 px-4 py-2 text-sm transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                    >
                        <FaSignOutAlt size={17} />
                        Logout
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-10">
                {/* Overview */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold">
                        Newsletter Overview
                    </h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Monitor and manage your ChizzyWrites subscribers.
                    </p>
                </div>

                {/* Statistics */}
                <div className="grid gap-5 md:grid-cols-3">
                    {[
                        {
                            label: "Total Subscribers",
                            value: stats.total,
                            Icon: FaUsers,
                        },
                        {
                            label: "Active Subscribers",
                            value: stats.active,
                            Icon: FaUserCheck,
                        },
                        {
                            label: "Unsubscribed",
                            value: stats.unsubscribed,
                            Icon: FaUserTimes,
                        },
                    ].map(({ label, value, Icon }) => (
                        <div
                            key={label}
                            className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/5"
                        >
                            <div className="mb-5">
                                <div className="inline-flex rounded-xl bg-black/5 p-3 dark:bg-white/10">
                                    <Icon size={22} />
                                </div>
                            </div>

                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {label}
                            </p>

                            <p className="mt-2 text-3xl font-bold">
                                {loadingSubscribers ? "—" : value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Newsletter Composer */}
                <section className="mt-10 rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/5 sm:p-8">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="rounded-xl bg-black/5 p-3 dark:bg-white/10">
                            <FaEnvelope size={21} />
                        </div>

                        <div>
                            <h2 className="text-xl font-semibold">
                                Compose Newsletter
                            </h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Write an email for your ChizzyWrites readers.
                            </p>
                        </div>
                    </div>

                    <form
                        onSubmit={handleSendNewsletter}
                        className="space-y-5"
                    >
                        <div>
                            <label
                                htmlFor="newsletter-subject"
                                className="mb-2 block text-sm font-medium"
                            >
                                Email subject
                            </label>

                            <input
                                id="newsletter-subject"
                                type="text"
                                value={newsletterSubject}
                                onChange={(event) =>
                                    setNewsletterSubject(event.target.value)
                                }
                                placeholder="e.g. A new perspective on personal growth"
                                maxLength={200}
                                required
                                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-chizzy-gold dark:border-white/10 dark:bg-chizzy-dark"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="newsletter-content"
                                className="mb-2 block text-sm font-medium"
                            >
                                Newsletter content (HTML)
                            </label>

                            <textarea
                                id="newsletter-content"
                                value={newsletterContent}
                                onChange={(event) =>
                                    setNewsletterContent(event.target.value)
                                }
                                placeholder="<h1>Hello, readers!</h1><p>Write your newsletter here...</p>"
                                rows={12}
                                required
                                className="w-full resize-y rounded-xl border border-black/10 bg-white px-4 py-3 font-mono text-sm outline-none focus:border-chizzy-gold dark:border-white/10 dark:bg-chizzy-dark"
                            />

                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                This field accepts HTML markup, not a visual
                                email editor. Use inline styles for email
                                formatting.
                            </p>
                        </div>

                        <div>
                            <p className="mb-3 text-sm font-medium">
                                Sending mode
                            </p>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 p-4 dark:border-white/10">
                                    <input
                                        type="radio"
                                        name="newsletter-mode"
                                        value="test"
                                        checked={newsletterMode === "test"}
                                        onChange={() => {
                                            setNewsletterMode("test");
                                            setNewsletterMessage("");
                                        }}
                                        className="mt-1 accent-amber-600"
                                    />

                                    <span>
                                        <span className="block text-sm font-semibold">
                                            Send test email
                                        </span>
                                        <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                                            Intended for the logged-in admin
                                            only.
                                        </span>
                                    </span>
                                </label>

                                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 p-4 dark:border-white/10">
                                    <input
                                        type="radio"
                                        name="newsletter-mode"
                                        value="campaign"
                                        checked={newsletterMode === "campaign"}
                                        onChange={() => {
                                            setNewsletterMode("campaign");
                                            setNewsletterMessage("");
                                        }}
                                        className="mt-1 accent-amber-600"
                                    />

                                    <span>
                                        <span className="block text-sm font-semibold">
                                            Send to subscribers
                                        </span>
                                        <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                                            Sends to all active subscribers.
                                        </span>
                                    </span>
                                </label>
                            </div>
                        </div>

                        {newsletterMessage && (
                            <div
                                role="status"
                                className="rounded-xl border border-black/10 p-4 text-sm dark:border-white/10"
                            >
                                {newsletterMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={
                                sendingNewsletter ||
                                loadingSubscribers ||
                                (newsletterMode === "campaign" &&
                                    stats.active === 0)
                            }
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-chizzy-ink px-5 py-3 font-semibold text-white transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-chizzy-white dark:text-chizzy-dark sm:w-auto"
                        >
                            <FaPaperPlane size={15} />

                            {sendingNewsletter
                                ? "Sending..."
                                : newsletterMode === "test"
                                  ? "Send Test Email"
                                  : `Send to ${stats.active} Active Subscribers`}
                        </button>
                    </form>
                </section>

                {/* Subscribers */}
                <section className="mt-10">
                    <div className="mb-5">
                        <h2 className="text-xl font-semibold">
                            Subscribers
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            View everyone subscribed to the ChizzyWrites
                            newsletter.
                        </p>
                    </div>

                    {/* Search, filter and export */}
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row">
                        <input
                            type="search"
                            placeholder="Search by email..."
                            value={searchTerm}
                            onChange={(event) => {
                                setSearchTerm(event.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-chizzy-gold dark:border-white/10 dark:bg-white/5 sm:flex-1"
                        />

                        <select
                            value={statusFilter}
                            onChange={(event) => {
                                setStatusFilter(event.target.value);
                                setCurrentPage(1);
                            }}
                            className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-chizzy-gold dark:border-white/10 dark:bg-chizzy-dark sm:w-48"
                        >
                            <option value="all">All subscribers</option>
                            <option value="active">Active</option>
                            <option value="unsubscribed">Unsubscribed</option>
                        </select>

                        <button
                            type="button"
                            onClick={handleExportCSV}
                            disabled={
                                loadingSubscribers ||
                                filteredSubscribers.length === 0
                            }
                            className="rounded-xl bg-chizzy-ink px-4 py-3 text-sm font-semibold text-white transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-chizzy-white dark:text-chizzy-dark"
                        >
                            Export CSV
                        </button>
                    </div>

                    {/* Subscribers Table */}
                    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/5">
                        {loadingSubscribers ? (
                            <div className="p-8 text-center text-sm text-gray-500">
                                Loading subscribers...
                            </div>
                        ) : filteredSubscribers.length === 0 ? (
                            <div className="p-8 text-center text-sm text-gray-500">
                                {searchTerm || statusFilter !== "all"
                                    ? "No subscribers match your search."
                                    : "No subscribers yet."}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="border-b border-black/10 dark:border-white/10">
                                        <tr>
                                            <th className="px-6 py-4 text-sm font-semibold">
                                                Email
                                            </th>
                                            <th className="px-6 py-4 text-sm font-semibold">
                                                Status
                                            </th>
                                            <th className="px-6 py-4 text-sm font-semibold">
                                                Subscribed
                                            </th>
                                            <th className="px-6 py-4 text-right text-sm font-semibold">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {paginatedSubscribers.map(
                                            (subscriber) => (
                                                <tr
                                                    key={subscriber.id}
                                                    className="border-b border-black/5 last:border-0 dark:border-white/5"
                                                >
                                                    <td className="px-6 py-4 text-sm">
                                                        {subscriber.email}
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        <span
                                                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                                                                subscriber.status ===
                                                                "active"
                                                                    ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                                                                    : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400"
                                                            }`}
                                                        >
                                                            {subscriber.status}
                                                        </span>
                                                    </td>

                                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                        {subscriber.subscribed_at
                                                            ? new Date(
                                                                  subscriber.subscribed_at
                                                              ).toLocaleDateString(
                                                                  "en-NG",
                                                                  {
                                                                      day: "numeric",
                                                                      month: "short",
                                                                      year: "numeric",
                                                                  }
                                                              )
                                                            : "—"}
                                                    </td>

                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleToggleStatus(
                                                                        subscriber
                                                                    )
                                                                }
                                                                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                                                                    subscriber.status ===
                                                                    "active"
                                                                        ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                                                                        : "text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10"
                                                                }`}
                                                            >
                                                                {subscriber.status ===
                                                                "active"
                                                                    ? "Unsubscribe"
                                                                    : "Reactivate"}
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleDeleteSubscriber(
                                                                        subscriber
                                                                    )
                                                                }
                                                                className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:hover:bg-red-500/10"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {!loadingSubscribers &&
                        filteredSubscribers.length > 0 && (
                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Showing {startIndex + 1}–
                                    {Math.min(
                                        startIndex + subscribersPerPage,
                                        filteredSubscribers.length
                                    )}{" "}
                                    of {filteredSubscribers.length} subscribers
                                </p>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCurrentPage((page) =>
                                                Math.max(1, page - 1)
                                            )
                                        }
                                        disabled={currentPage === 1}
                                        className="rounded-lg border border-black/10 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
                                    >
                                        Previous
                                    </button>

                                    <span className="px-2 text-sm">
                                        Page {currentPage} of {totalPages}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCurrentPage((page) =>
                                                Math.min(totalPages, page + 1)
                                            )
                                        }
                                        disabled={currentPage >= totalPages}
                                        className="rounded-lg border border-black/10 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                </section>
            </main>
        </div>
    );
};

export default AdminDashboard;