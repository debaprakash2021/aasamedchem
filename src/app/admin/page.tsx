import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const usersCount = await prisma.user.count();
  const productsCount = await prisma.product.count();
  const ordersCount = await prisma.order.count();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-400">
          Admin Dashboard
        </h1>
        <p className="text-slate-400 mt-2">System overview and quick actions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-center items-center relative overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">Total Users</h2>
          <p className="text-5xl font-bold text-white">{usersCount}</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-center items-center relative overflow-hidden group hover:border-blue-500/30 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">Total Products</h2>
          <p className="text-5xl font-bold text-white">{productsCount}</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-center items-center relative overflow-hidden group hover:border-purple-500/30 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">Total Orders</h2>
          <p className="text-5xl font-bold text-white">{ordersCount}</p>
        </div>
      </div>
    </div>
  );
}
