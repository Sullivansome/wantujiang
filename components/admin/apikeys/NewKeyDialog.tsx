"use client";

import { ApiKey } from "./types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface NewKeyDialogProps {
  keyData: ApiKey | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewKeyDialog({
  keyData,
  isOpen,
  onOpenChange,
}: NewKeyDialogProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (!keyData) return;
    navigator.clipboard.writeText(keyData.key);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!keyData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新API密钥创建成功</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>订单号</Label>
            <p className="font-mono text-sm">{keyData.order_id}</p>
          </div>
          <div className="space-y-2">
            <Label>API密钥</Label>
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm">{keyData.key}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCopy}
              >
                {isCopied ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>初始次数</Label>
            <p>{keyData.credits}</p>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => onOpenChange(false)}>关闭</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
