"use client";

import Link from "next/link";

import { signOut } from "next-auth/react";
import { Eye, LogOut, UserCog } from "lucide-react";
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

export function UserMenu({
  name,
  email,
  role,
}: {
  name?: string | null;
  email?: string | null;
  role?: string | null;
}) {
  const initials = (name || email || "?").slice(0, 2).toUpperCase();
  // Docents i superadmin poden veure l'espai d'alumne per comprovar què veu l'alumnat.
  const potVeureComAlumne = role === "TEACHER" || role === "SUPERADMIN";

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
        {potVeureComAlumne && (
          <DropdownMenuItem render={<Link href="/student?vista=prova" />}>
            <Eye />
            Veure com a alumne
          </DropdownMenuItem>
        )}
        <DropdownMenuItem render={<Link href="/compte" />}>
          <UserCog />
          El meu compte
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
          <LogOut />
          Tancar sessió
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
