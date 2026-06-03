import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { GET } from "@/app/api/auth/[...nextauth]/route";
import { updateInventory } from "@/app/actions/inventory";

export default async function InventoryPage() {
  const session = await getServerSession(GET as any);
  const userId = (session?.user as any)?.id;

  const products = await prisma.product.findMany({
    where: { sellerId: userId },
    include: { inventory: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-400">
          Inventory Management
        </h1>
        <p className="text-slate-400 mt-2">Update stock levels for your products</p>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="text-xs uppercase bg-slate-900/50 text-slate-400 border-b border-white/5">
            <tr>
              <th className="px-6 py-4 font-medium">Product Name</th>
              <th className="px-6 py-4 font-medium">Base Unit</th>
              <th className="px-6 py-4 font-medium">Current Stock</th>
              <th className="px-6 py-4 font-medium text-right">Update Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {products.map((product) => {
              const currentStock = product.inventory?.quantity?.toString() || "0";
              
              return (
                <tr key={product.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{product.name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-white/10 rounded text-xs">{product.baseUnit}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-semibold ${parseFloat(currentStock) === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {currentStock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <form action={updateInventory} className="flex justify-end gap-2">
                      <input type="hidden" name="productId" value={product.id} />
                      <input 
                        type="number" 
                        name="quantity" 
                        step="any"
                        defaultValue={currentStock} 
                        required 
                        className="w-24 glass-input px-3 py-1.5 rounded-lg text-sm text-right"
                      />
                      <button 
                        type="submit" 
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {products.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            No products available. Please add products first.
          </div>
        )}
      </div>
    </div>
  );
}
