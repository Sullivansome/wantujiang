// app/admin/unauthorized/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Unauthorized</h1>
      <p>You do not have permission to access this page.</p>
      <Button onClick={handleLogout}>Logout</Button>
    </div>
  );
}
