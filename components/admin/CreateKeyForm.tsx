"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { generateApiKey } from "@/lib/api-keys";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export function CreateKeyForm() {
  const [orderId, setOrderId] = useState<number | "">("");
  const [credits, setCredits] = useState<number>(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const apiKey = generateApiKey();

      const supabase = createClientComponentClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/admin/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          order_id: orderId.toString(), // sent as string to match table
          credits,
          key: apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setSuccess("API key created successfully!");
      setOrderId("");
      setCredits(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <div className="space-y-2">
        <Label htmlFor="orderId">支付宝订单号</Label>
        <Input
          id="orderId"
          type="number"
          value={orderId}
          onChange={(e) =>
            setOrderId(e.target.value === "" ? "" : Number(e.target.value))
          }
          placeholder="输入支付宝订单号"
          required
          min="0"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="credits">初始积分</Label>
        <Input
          id="credits"
          type="number"
          value={credits}
          onChange={(e) => setCredits(parseInt(e.target.value) || 0)}
          min="1"
          required
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-green-500">{success}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? "创建中..." : "创建API密钥"}
      </Button>
    </form>
  );
}
