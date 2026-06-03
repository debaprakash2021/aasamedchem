import { prisma } from "@/lib/prisma";
import { UserTable } from "@/components/UserTable";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" }
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-400">
            Users Management
          </h1>
          <p className="text-slate-400 mt-2">Manage platform users and access controls</p>
        </div>
      </div>

      <UserTable initialUsers={users as any} />
    </div>
  );
}
