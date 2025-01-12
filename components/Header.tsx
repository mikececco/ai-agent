"use client";

import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  return (
    <header className="border-b bg-white">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden"
          >
            <HamburgerMenuIcon className="h-5 w-5" />
          </Button>
          <div className="font-semibold">AI Chat</div>
        </div>
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
