import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { InventoryUpdateForm } from "@/components/InventoryUpdateForm";

export default async function InventoryPage() {
  const session = await getServerSession(authOptions);
  const sellerId = (session?.user as any)?.sellerId as string;

  const products = await prisma.product.findMany({
    where: { sellerId, status: { not: "DISCONTINUED" } },
    include: { baseUnit: true, inventory: true },
    orderBy: { name: "asc" },
  });

  const lowStock = products.filter((p) => {
    const q = parseFloat(p.inventory?.quantity?.toString() ?? "0");
    const r = parseFloat(p.inventory?.reorderLevel?.toString() ?? "0");
    return q <= r && q >= 0;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Inventory Management</h1>
        <p className="text-slate-400">Set stock levels in base units. Quantities are automatically deducted when orders are placed.</p>
      </div>

      {lowStock.length > 0 && (
        <div className="p-4 glass-panel rounded-xl border border-yellow-500/30 bg-yellow-500/5">
          <p className="text-yellow-400 font-medium">
            ⚠ {lowStock.length} product{lowStock.length > 1 ? "s" : ""} are at or below reorder level:{" "}
            {lowStock.map((p) => p.name).join(", ")}
          </p>
        </div>
      )}

      <div className="grid gap-4">
        {products.map((product) => (
          <div key={product.id} className="glass-panel p-5 rounded-xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-lg">{product.name}</h3>
              <p className="text-xs font-mono text-slate-500">SKU: {product.sku}</p>
            </div>
            
            <InventoryUpdateForm 
              product={{
                id: product.id,
                name: product.name,
                sku: product.sku,
                baseUnit: product.baseUnit.code,
                currentStock: product.inventory?.quantity?.toString() ?? "0",
                reorderLevel: product.inventory?.reorderLevel?.toString() ?? "0"
              }}
            />
          </div>
        ))}

        {products.length === 0 && (
          <div className="text-center p-12 glass-panel rounded-2xl text-slate-400">
            No products found. Add products in My Products first.
          </div>
        )}
      </div>
    </div>
  );
}
