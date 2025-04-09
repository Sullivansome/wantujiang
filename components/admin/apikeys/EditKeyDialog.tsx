"use client";

import { ApiKey } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";

interface EditKeyDialogProps {
  keyData: ApiKey | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Partial<ApiKey>) => Promise<void>;
}

export function EditKeyDialog({
  keyData,
  isOpen,
  onOpenChange,
  onSave,
}: EditKeyDialogProps) {
  const [credits, setCredits] = useState(keyData?.credits || 0);
  const [status, setStatus] = useState<"active" | "revoked">(
    keyData?.status || "active",
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (keyData) {
      setCredits(keyData.credits);
      setStatus(keyData.status);
    }
  }, [keyData]);

  const handleSubmit = async () => {
    if (!keyData) return;

    const updates: Partial<ApiKey> = {};
    if (credits !== keyData.credits) updates.credits = credits;
    if (status !== keyData.status) updates.status = status;

    if (Object.keys(updates).length > 0) {
      setIsLoading(true);
      try {
        await onSave(keyData.id, updates);
        onOpenChange(false);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!keyData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑API密钥</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>订单号</Label>
            <p className="font-mono text-sm">{keyData.order_id}</p>
          </div>
          <div className="space-y-2">
            <Label>API密钥</Label>
            <p className="font-mono text-sm">
              {keyData.key.slice(0, 8)}...{keyData.key.slice(-4)}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="credits">次数</Label>
            <Input
              id="credits"
              type="number"
              value={credits}
              onChange={(e) => setCredits(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">状态</Label>
            <Select
              value={status}
              onValueChange={(value: "active" | "revoked") => setStatus(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
