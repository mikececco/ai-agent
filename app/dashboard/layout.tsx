"use client";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Authenticated } from "convex/react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Authenticated>
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <Header />
          {children}
        </main>
      </div>
    </Authenticated>
  );
}
