// components/AdminNavbar.tsx
"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import Link from "next/link";

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
        <h1 className="text-lg font-semibold">管理员面板</h1>
        <div className="flex gap-x-4">
          <Link href="/">
            <Button variant="outline">首页</Button>
          </Link>
          <Button variant="outline" onClick={handleLogout}>
            登出
          </Button>
        </div>
      </div>
    </header>
  );
}
