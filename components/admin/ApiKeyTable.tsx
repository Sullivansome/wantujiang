"use client";

import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
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

interface ApiKey {
  id: string;
  order_id: string;
  key: string;
  credits: number;
  status: "active" | "expired" | "revoked";
  created_at: string;
  last_used: string | null;
  total_used: number;
  max_requests_per_minute: number;
  allowed_ips: string[] | null;
}

export function ApiKeyTable() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKeys = async () => {
      try {
        const res = await fetch("/api/admin/keys");
        const data = await res.json();
        setKeys(data);
      } catch (error) {
        console.error("Failed to fetch API keys:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchKeys();
  }, []);

  const updateKey = async (id: string, updates: Partial<ApiKey>) => {
    try {
      const res = await fetch(`/api/admin/keys`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, updates }),
      });
      const updatedKey = await res.json();

      setKeys(
        keys.map((key) => (key.id === id ? { ...key, ...updatedKey } : key)),
      );
    } catch (error) {
      console.error("Failed to update API key:", error);
    }
  };

  if (loading) return <div className="py-4 text-center">加载中...</div>;

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
            <TableHead>请求限制</TableHead>
            <TableHead>IP限制</TableHead>
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
                {key.key.substring(0, 8)}...
                {key.key.substring(key.key.length - 4)}
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={key.credits}
                  onChange={(e) =>
                    updateKey(key.id, {
                      credits: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-20"
                />
              </TableCell>
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
                <Input
                  type="number"
                  value={key.max_requests_per_minute}
                  onChange={(e) =>
                    updateKey(key.id, {
                      max_requests_per_minute: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-20"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={key.allowed_ips?.join(", ") || ""}
                  onChange={(e) =>
                    updateKey(key.id, {
                      allowed_ips: e.target.value
                        .split(",")
                        .map((ip) => ip.trim()),
                    })
                  }
                  placeholder="无限制"
                  className="w-40"
                />
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
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
