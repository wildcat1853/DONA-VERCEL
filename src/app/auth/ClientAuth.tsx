"use client";
import { User } from "next-auth";
import { signIn } from "next-auth/react";
import React, { useEffect, useLayoutEffect } from "react";

type Props = { user: Omit<User, "id"> | undefined };

function ClientAuth({ user }: Props) {
  useLayoutEffect(() => {
    if (!user) signIn("google");
  }, []);
  return <></>;
}

export default ClientAuth;
