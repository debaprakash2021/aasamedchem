import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function InventoryPage() {
  const session = await getServerSession(authOptions);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-400">
          Inventory Management
        </h1>
        <p className="text-slate-400 mt-2">Update stock levels for your products</p>
      </div>

      <div className="glass-panel p-6 rounded-2xl text-center text-slate-400">
        <p>Inventory management - Phase 2 Implementation</p>
      </div>
    </div>
  );
}
