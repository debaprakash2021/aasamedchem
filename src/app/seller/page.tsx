import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { GET } from "@/app/api/auth/[...nextauth]/route";

export default async function SellerDashboard() {
  const session = await getServerSession(GET as any);
  const userId = (session?.user as any)?.id;

  const productsCount = await prisma.product.count({ where: { sellerId: userId } });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-400">
          Seller Dashboard
        </h1>
        <p className="text-slate-400 mt-2">Manage your catalog and inventory</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-center items-center relative overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">My Products</h2>
          <p className="text-5xl font-bold text-white">{productsCount}</p>
        </div>
      </div>
    </div>
  );
}
