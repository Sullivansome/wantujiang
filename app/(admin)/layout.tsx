// app/admin/layout.tsx
"use client"; // Must be client component

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin/login");
      } else {
        // Verify admin status
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .single();

        if (!profile?.is_admin) {
          await supabase.auth.signOut();
          router.replace("/admin/login");
        }
      }
    };

    checkAuth();
  }, [router, supabase]);

  return <>{children}</>;
}
