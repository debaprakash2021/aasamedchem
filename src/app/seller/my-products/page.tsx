import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AddProductForm } from "@/components/AddProductForm";
import { deleteProduct } from "@/app/actions/product";

export default async function MyProductsPage() {
  const session = await getServerSession(authOptions);
  const sellerId = (session?.user as any)?.sellerId as string;

  const products = await prisma.product.findMany({
    where: { sellerId, status: { not: "DISCONTINUED" } },
    include: {
      baseUnit: true,
      inventory: true,
      supportedUnits: true,
      _count: { select: { quotationItems: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Products</h1>
          <p className="text-slate-400">{products.length} product{products.length !== 1 ? "s" : ""} in your catalog</p>
        </div>
        <AddProductForm />
      </div>

      {products.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl text-slate-400">
          No products yet. Click &ldquo;+ New Product&rdquo; to add your first.
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/50 text-xs uppercase text-slate-400 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium">Base Price</th>
                <th className="px-6 py-4 font-medium">Supported Units</th>
                <th className="px-6 py-4 font-medium text-right">Stock</th>
                <th className="px-6 py-4 font-medium text-right">Orders</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {products.map((product) => {
                const stock = parseFloat(product.inventory?.quantity?.toString() ?? "0");
                return (
                  <tr key={product.id} className="hover:bg-white/5">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{product.name}</div>
                      <div className="text-xs text-slate-500 font-mono mb-1">{product.sku}</div>
                      {product.description && (
                        <div className="text-xs text-slate-400 truncate max-w-xs">{product.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-indigo-300">
                      ₹{parseFloat(product.basePrice.toString()).toFixed(2)}
                      <span className="text-slate-500 text-xs font-normal">/{product.baseUnit.code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {product.supportedUnits.map((u) => (
                          <span
                            key={u.code}
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              u.code === product.baseUnit.code
                                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                : "bg-white/5 text-slate-400 border border-white/10"
                            }`}
                          >
                            {u.code}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-medium ${
                        stock === 0 ? "text-red-400" :
                        stock < 5 ? "text-yellow-400" : "text-emerald-400"
                      }`}>
                        {stock.toFixed(2)} {product.baseUnit.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {product._count.quotationItems}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <form action={async () => {
                        "use server";
                        await deleteProduct(product.id);
                      }}>
                        <button type="submit" className="text-red-400 hover:text-red-300 text-xs font-medium px-2 py-1 bg-red-400/10 hover:bg-red-400/20 rounded transition-colors">
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
