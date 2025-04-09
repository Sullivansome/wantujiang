"use client";

import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface ApiKey {
  id: string;
  order_id: string;
  key: string;
  credits: number;
  status: "active" | "expired" | "revoked";
  created_at: string;
  last_used: string | null;
  total_used: number;
}

export function ApiKeyTable() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [creditsDraft, setCreditsDraft] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKeys = async () => {
      try {
        const supabase = createClientComponentClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const accessToken = session?.access_token;
        if (!accessToken) throw new Error("No access token");

        const res = await fetch("/api/admin/keys", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setKeys(data);
          const draft: Record<string, number> = {};
          data.forEach((k) => (draft[k.id] = k.credits));
          setCreditsDraft(draft);
        } else throw new Error("Expected array got " + JSON.stringify(data));
      } catch (error) {
        console.error("Failed to fetch API keys:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchKeys();
  }, []);

  // updateKey triggers update request for given ID
  const updateKey = async (id: string, updates: Partial<ApiKey>) => {
    try {
      const supabase = createClientComponentClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("No access token");

      const res = await fetch("/api/admin/keys", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ id, updates }),
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const updatedKey = await res.json();

      setKeys(keys.map((k) => (k.id === id ? { ...k, ...updatedKey } : k)));
      setCreditsDraft((prev) => ({ ...prev, [id]: updatedKey.credits }));
    } catch (error) {
      console.error("Failed to update API key:", error);
      alert(error instanceof Error ? error.message : "更新失败");
    }
  };

  if (loading) return <div className="py-4 text-center">加载中...</div>;
  if (error)
    return <div className="py-4 text-center text-red-500">{error}</div>;
  if (!keys.length) return <div className="py-4 text-center">暂无API密钥</div>;

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>订单号</TableHead>
            <TableHead>API密钥</TableHead>
            <TableHead>积分</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>最后使用</TableHead>
            <TableHead>总使用</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.map((key) => (
            <TableRow key={key.id}>
              <TableCell className="font-mono text-sm">
                {key.order_id}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {key.key.slice(0, 8)}...{key.key.slice(-4)}
              </TableCell>
              <TableCell>{key.credits}</TableCell>
              <TableCell>
                <Badge
                  variant={key.status === "active" ? "default" : "destructive"}
                  className="capitalize"
                >
                  {key.status}
                </Badge>
              </TableCell>
              <TableCell>
                {key.last_used
                  ? format(new Date(key.last_used), "PPpp", { locale: zhCN })
                  : "从未使用"}
              </TableCell>
              <TableCell>{key.total_used}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      updateKey(key.id, { credits: creditsDraft[key.id] })
                    }
                  >
                    修改积分
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={key.status === "revoked"}
                    onClick={() => updateKey(key.id, { status: "revoked" })}
                  >
                    撤销
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
