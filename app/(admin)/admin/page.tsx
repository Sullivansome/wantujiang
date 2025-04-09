import { ApiKeyTable } from "@/components/admin/ApiKeyTable";
import { CreateKeyForm } from "@/components/admin/CreateKeyForm";
import { AdminNavbar } from "@/components/AdminNavbar";
import AuthRedirect from "@/components/AuthRedirect";



export default function AdminPage() {
  return (
    <AuthRedirect>
    <div className="container mx-auto px-4 py-8">
      <AdminNavbar/>
      <h1 className="mb-6 text-2xl font-bold">API Key Management</h1>

      <div className="grid gap-8">
        <section>
          <h2 className="mb-4 text-xl font-semibold">Create New API Key</h2>
          <CreateKeyForm />
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">Manage Existing Keys</h2>
          <ApiKeyTable />
        </section>
      </div>
    </div>
    </AuthRedirect>
  );
}
