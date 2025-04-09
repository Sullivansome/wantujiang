// components/AuthRedirect.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AuthRedirect({
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
        router.push("/admin/login");
      } else {
        // Check if admin
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .single();

        if (!profile?.is_admin) {
          router.push("/admin/unauthorized");
        }
      }
    };

    checkAuth();
  }, [router, supabase]);

  return <>{children}</>;
}
