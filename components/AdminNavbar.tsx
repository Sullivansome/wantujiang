// components/AdminNavbar.tsx
"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

export function AdminNavbar() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between">
        <h1 className="text-lg font-semibold">Admin Dashboard</h1>
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </header>
  );
}
