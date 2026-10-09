import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function AdminRoute({ children }) {
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState(null);

    useEffect(() => {
        const getSession = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            setSession(session);
            setLoading(false);
        };

        getSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    if (loading) {
        return (
            <main className="min-h-screen bg-chizzy-paper dark:bg-chizzy-dark text-chizzy-ink dark:text-chizzy-white flex items-center justify-center">
                <p className="text-sm opacity-60">Loading...</p>
            </main>
        );
    }

    if (!session) {
        return <Navigate to="/admin/login" replace />;
    }

    return children;
}