"use client";
import { User } from "next-auth";
import { signIn, useSession } from "next-auth/react";
import React, { useEffect } from "react";

type Props = { user: Omit<User, "id"> | undefined };

function ClientAuth({ user }: Props) {
  const { status } = useSession();
  
  useEffect(() => {
    if (!user && status === 'unauthenticated') {
      signIn("google");
    }
  }, [user, status]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E5F1F1] via-[#FAF0F1] to-[#EDD9FE]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-700">Loading...</p>
      </div>
    </div>
  );
}

export default ClientAuth;

