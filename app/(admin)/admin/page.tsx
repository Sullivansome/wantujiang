import { ApiKeyTable } from "@/components/admin/apikeys/ApiKeyTable";
import { AdminNavbar } from "@/components/AdminNavbar";
import AuthRedirect from "@/components/AuthRedirect";

export default function AdminPage() {
  return (
    <AuthRedirect>
      <div className="container mx-auto px-4 py-8">
        <AdminNavbar />
        <h1 className="mb-6 text-2xl font-bold">API Key管理</h1>

        <ApiKeyTable />
      </div>
    </AuthRedirect>
  );
}
