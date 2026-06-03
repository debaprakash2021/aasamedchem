import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { GET } from "@/app/api/auth/[...nextauth]/route";
import { AddProductForm } from "@/components/AddProductForm";

export default async function MyProductsPage() {
  const session = await getServerSession(GET as any);
  const userId = (session?.user as any)?.id;

  const products = await prisma.product.findMany({
    where: { sellerId: userId },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-400">
            My Products
          </h1>
          <p className="text-slate-400 mt-2">Manage your product catalog</p>
        </div>
        <AddProductForm />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-indigo-500/30 transition-all flex flex-col">
            <h3 className="text-xl font-bold text-white mb-1">{product.name}</h3>
            <p className="text-sm text-slate-400 mb-4 flex-1">{product.description}</p>
            
            <div className="flex items-end justify-between mt-auto pt-4 border-t border-white/10">
              <div>
                <p className="text-xs text-slate-500 uppercase">Base Price</p>
                <p className="text-lg font-semibold text-indigo-300">₹{product.basePrice.toString()} / {product.baseUnit}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase">Supported Units</p>
                <div className="flex gap-1 justify-end mt-1">
                  {Object.keys(product.conversionFactors as any).map(u => (
                    <span key={u} className="px-1.5 py-0.5 bg-white/10 rounded text-xs">{u}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        {products.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-white/20 rounded-2xl">
            No products found. Add your first product!
          </div>
        )}
      </div>
    </div>
  );
}
