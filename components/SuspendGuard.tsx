"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect } from "react";

export default function SuspendGuard({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();

    useEffect(() => {
        // We only want to run this check if the session has fully loaded
        if (status === "authenticated" && session) {
            // Look for that secret flag we added in auth.ts
            if ((session as any).error === "SUSPENDED") {
                console.warn("🔒 SuspendGuard: Organization is suspended. Forcing logout.");

                // signOut destroys the local token and kicks them to the login screen
                // We append a URL parameter so the login screen knows WHY they were kicked out
                signOut({ callbackUrl: "/?error=suspended" });
            }
        }
    }, [session, status]);

    // If they aren't suspended, just render the app normally!
    return <>{children}</>;
}