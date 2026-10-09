import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function AdminLogin() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        setStatus("loading");
        setError("");

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.error(error);
            setStatus("error");
            setError("Invalid email or password.");
            return;
        }

        navigate("/admin/dashboard");
    };

    return (
        <main className="min-h-screen bg-chizzy-paper dark:bg-chizzy-dark text-chizzy-ink dark:text-chizzy-white flex items-center justify-center px-6">
            <div className="w-full max-w-md">

                <div className="text-center mb-10">
                    <p className="text-sm uppercase tracking-[0.25em] text-[#b7791f] mb-4">
                        ChizzyWrites
                    </p>

                    <h1 className="heading-font text-4xl md:text-5xl">
                        Admin Login
                    </h1>

                    <p className="mt-4 text-black/60 dark:text-white/60">
                        Sign in to manage your publication.
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-5"
                >
                    <div>
                        <label className="block text-sm mb-2">
                            Email
                        </label>

                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="
                                w-full
                                h-12
                                px-4
                                rounded-xl
                                border
                                border-black/10
                                dark:border-white/10
                                bg-white
                                dark:bg-white/5
                                outline-none
                                focus:border-[#b7791f]
                            "
                            placeholder="admin@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm mb-2">
                            Password
                        </label>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="
                                w-full
                                h-12
                                px-4
                                rounded-xl
                                border
                                border-black/10
                                dark:border-white/10
                                bg-white
                                dark:bg-white/5
                                outline-none
                                focus:border-[#b7791f]
                            "
                            placeholder="••••••••"
                        />
                    </div>

                    {status === "error" && (
                        <p className="text-sm text-red-500">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={status === "loading"}
                        className="
                            w-full
                            h-12
                            rounded-xl
                            bg-[#171717]
                            dark:bg-[#f5f2ea]
                            text-white
                            dark:text-[#111111]
                            font-medium
                            hover:opacity-80
                            transition
                            disabled:opacity-50
                        "
                    >
                        {status === "loading"
                            ? "Signing in..."
                            : "Sign in"}
                    </button>
                </form>
            </div>
        </main>
    );
}