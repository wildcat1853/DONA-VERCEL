"use client";

import { SessionProvider } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ClientAuth from "./ClientAuth";

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

  return (
    <SessionProvider session={session}>
      <ClientAuth user={user} />
    </SessionProvider>
  );
} 