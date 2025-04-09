import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ApiKeyCell({ keyText }: { keyText: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(keyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm">
        {keyText.slice(0, 8)}...{keyText.slice(-4)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handleCopy}
      >
        {copied ? (
          <span className="text-green-600">
            <Check className="h-3 w-3" />
          </span>
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}
