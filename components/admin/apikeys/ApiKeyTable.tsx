"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { columns } from "./columns";
import { ApiKey } from "./types";
import { CreateKeyDialog } from "./CreateKeyDialog";
import { EditKeyDialog } from "./EditKeyDialog";
import { NewKeyDialog } from "./NewKeyDialog";

export function ApiKeyTable() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<ApiKey | null>(null);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data: keys,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

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

  const handleCreateKey = async (orderId: string, credits: number) => {
    const supabase = createClientComponentClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) throw new Error("No access token");

    const res = await fetch("/api/admin/keys", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        order_id: orderId,
        credits: credits,
      }),
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const createdKey = await res.json();

    setKeys([createdKey, ...keys]);
    setNewKey(createdKey);
    setShowNewKeyDialog(true);

    toast("创建成功");
  };

  const handleEditKey = async (id: string, updates: Partial<ApiKey>) => {
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

    setKeys(keys.map((k) => (k.id === id ? updatedKey : k)));
    toast("更新成功");
  };

  if (loading) return <div className="py-4 text-center">加载中...</div>;
  if (error)
    return <div className="py-4 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            placeholder="搜索订单号..."
            value={
              (table.getColumn("order_id")?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table.getColumn("order_id")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">选择可见的列</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CreateKeyDialog onCreate={handleCreateKey}>
          <Button>创建新密钥</Button>
        </CreateKeyDialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="[&:hover]:bg-muted/50">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {cell.column.id === "actions" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingKey(row.original)}
                        >
                          编辑
                        </Button>
                      ) : (
                        flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  暂无数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          上一页
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          下一页
        </Button>
      </div>

      <EditKeyDialog
        keyData={editingKey}
        isOpen={!!editingKey}
        onOpenChange={(open) => !open && setEditingKey(null)}
        onSave={handleEditKey}
      />

      <NewKeyDialog
        keyData={newKey}
        isOpen={showNewKeyDialog}
        onOpenChange={setShowNewKeyDialog}
      />
    </div>
  );
}
