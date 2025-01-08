"use client";

import { UserButton } from "@clerk/nextjs";

export default function Header() {
  return (
    <div className="h-14 border-b px-4 flex items-center justify-between">
      <div className="font-semibold">AI Chat</div>
      <UserButton afterSignOutUrl="/" />
    </div>
  );
}
