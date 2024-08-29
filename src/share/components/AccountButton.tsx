"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { User } from "@/lib/schemas";

type Props = { user: User };

function AccountButton({ user }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="cursor-pointer flex items-center gap-3 absolute top-5 left-5">
        <Avatar className="rounded-full size-8 flex justify-center items-center ">
          <AvatarImage className="rounded-full" src={user.image ?? ""} />
          <AvatarFallback className="rounded-full text-black text-2xl">
            Ac
          </AvatarFallback>
        </Avatar>
        {user.name}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          className="cursor-pointer text-red-600"
          onClick={() => signOut()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AccountButton;
