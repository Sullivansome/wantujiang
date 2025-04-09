import { ColumnDef } from "@tanstack/react-table";
import { ApiKey } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { ApiKeyCell } from "./ApiKeyCell";

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
    cell: ({ row }) => <ApiKeyCell keyText={row.getValue("key") as string} />,
  },
  {
    accessorKey: "credits",
    header: "次数",
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
