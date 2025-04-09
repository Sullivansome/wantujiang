"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { generateApiKey } from "@/lib/api-keys";

export function CreateKeyForm() {
  const [formData, setFormData] = useState({
    orderId: "",
    credits: 100,
    maxRequests: 10,
    allowedIps: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: formData.orderId,
          credits: formData.credits,
          max_requests_per_minute: formData.maxRequests,
          allowed_ips: formData.allowedIps
            ? formData.allowedIps.split(",").map((ip) => ip.trim())
            : null,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setSuccess("API key created successfully!");
      setFormData({
        orderId: "",
        credits: 100,
        maxRequests: 10,
        allowedIps: "",
      });
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
          value={formData.orderId}
          onChange={(e) =>
            setFormData({ ...formData, orderId: e.target.value })
          }
          placeholder="输入支付宝订单号"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="credits">初始积分</Label>
        <Input
          id="credits"
          type="number"
          value={formData.credits}
          onChange={(e) =>
            setFormData({ ...formData, credits: parseInt(e.target.value) || 0 })
          }
          min="1"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="maxRequests">每分钟最大请求数</Label>
        <Input
          id="maxRequests"
          type="number"
          value={formData.maxRequests}
          onChange={(e) =>
            setFormData({
              ...formData,
              maxRequests: parseInt(e.target.value) || 1,
            })
          }
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
