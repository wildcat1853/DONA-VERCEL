"use client";
import { User } from "next-auth";
import { signIn } from "next-auth/react";
import React, { useEffect } from "react";

type Props = { user: Omit<User, "id"> | undefined };

function ClientAuth({ user }: Props) {
  useEffect(() => {
    if (!user) signIn("google");
  }, []);
  return <></>;
}

export default ClientAuth;
