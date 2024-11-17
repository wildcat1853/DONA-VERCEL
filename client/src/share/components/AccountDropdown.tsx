'use client';
import React from "react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useSession, signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

function AccountDropdown() {
  const { data: session } = useSession();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2">
          <Avatar className="rounded-full size-10">
            <AvatarImage 
              src={session?.user?.image || ''} 
              alt={session?.user?.name || 'User'} 
            />
            <AvatarFallback>
              {session?.user?.name?.[0]?.toUpperCase() || 'A'}
            </AvatarFallback>
          </Avatar>
          <span>{session?.user?.name || 'Account'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => signOut()} className="text-red-600 cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AccountDropdown;
