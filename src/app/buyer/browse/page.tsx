import prisma from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";

export default async function BrowsePage() {
  const products = await prisma.product.findMany({
    include: { inventory: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-400">
          Browse Products
        </h1>
        <p className="text-slate-400 mt-2">Discover and order from verified sellers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}

        {products.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 glass-panel rounded-2xl">
            No products available at the moment.
          </div>
        )}
      </div>
    </div>
  );
}
