"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({ name, email }: { name?: string | null; email?: string | null }) {
  const initials = (name || email || "?").slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="h-auto gap-2 px-2 py-1.5">
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">{name || email}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{name || "Usuari"}</span>
            <span className="text-xs font-normal text-muted-foreground">{email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
          <LogOut />
          Tancar sessio
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
