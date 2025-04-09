import { ColumnDef } from "@tanstack/react-table";
import { ApiKey } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

export const columns: ColumnDef<ApiKey>[] = [
  {
    accessorKey: "order_id",
    header: "订单号",
    cell: ({ row }) => (
      <div className="font-mono text-sm">{row.getValue("order_id")}</div>
    ),
  },
  {
    accessorKey: "key",
    header: "API密钥",
    cell: ({ row }) => {
      const key = row.getValue("key") as string;

      return (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">
            {key.slice(0, 8)}...{key.slice(-4)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              navigator.clipboard.writeText(key);
            }}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      );
    },
  },
  {
    accessorKey: "credits",
    header: "积分",
  },
  {
    accessorKey: "status",
    header: "状态",
    cell: ({ row }) => {
      const status = row.getValue("status") as "active" | "revoked";
      return (
        <Badge
          variant={status === "active" ? "default" : "destructive"}
          className="capitalize"
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "last_used",
    header: "最后使用",
    cell: ({ row }) => {
      const lastUsed = row.getValue("last_used") as string | null;
      return lastUsed ? (
        <span>{format(new Date(lastUsed), "PPpp", { locale: zhCN })}</span>
      ) : (
        "从未使用"
      );
    },
  },
  {
    accessorKey: "total_used",
    header: "总使用",
  },
  {
    id: "actions",
    cell: () => (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            编辑
          </Button>
        </DialogTrigger>
      </Dialog>
    ),
  },
];
