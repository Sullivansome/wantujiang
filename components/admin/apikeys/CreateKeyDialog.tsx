"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CreateKeyDialogProps {
  onCreate: (orderId: string, credits: number) => Promise<void>;
  children: React.ReactNode;
}

export function CreateKeyDialog({ onCreate, children }: CreateKeyDialogProps) {
  const [orderId, setOrderId] = useState("");
  const [credits, setCredits] = useState(100);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await onCreate(orderId, credits);
      setOrderId("");
      setCredits(1000);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建新API密钥</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orderId">订单号</Label>
            <Input
              id="orderId"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="输入订单号"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="credits">初始积分</Label>
            <Input
              id="credits"
              type="number"
              value={credits}
              onChange={(e) => setCredits(Number(e.target.value))}
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "创建中..." : "创建"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
