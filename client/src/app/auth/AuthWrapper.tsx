"use client";

import { SessionProvider } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ClientAuth from "./ClientAuth";
import { track } from "@/share/utils/mixpanel";

export default function AuthWrapper({ 
  session, 
  user,
  redirectTo 
}: { 
  session: any;
  user: any;
  redirectTo?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (redirectTo) {
      router.push(redirectTo);
    }
  }, [redirectTo, router]);

  useEffect(() => {
    track("Auth Page View", {
      isAuthenticated: !!session,
      hasRedirect: !!redirectTo,
      timestamp: new Date().toISOString()
    });
  }, [session, redirectTo]);

  return (
    <SessionProvider session={session}>
      <ClientAuth user={user} />
    </SessionProvider>
  );
} 