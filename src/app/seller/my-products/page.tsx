import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function MyProductsPage() {
  const session = await getServerSession(authOptions);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-400">
            My Products
          </h1>
          <p className="text-slate-400 mt-2">Manage your product catalog</p>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl text-center text-slate-400">
        <p>Product management - Phase 2 Implementation</p>
      </div>
    </div>
  );
}
