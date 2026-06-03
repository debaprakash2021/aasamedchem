import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";
import { SearchInput } from "@/components/SearchInput";
import { Suspense } from "react";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q || "";

  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      isPublished: true,
      OR: q ? [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
      ] : undefined,
    },
    include: {
      seller: { select: { businessName: true } },
      baseUnit: true,
      supportedUnits: true,
      inventory: { select: { quantity: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Browse Catalog</h1>
          <p className="text-slate-400">Discover and order products from our verified sellers.</p>
        </div>
        <div className="w-full md:w-auto">
          <Suspense fallback={<div className="h-9 w-64 glass-input rounded-lg animate-pulse" />}>
            <SearchInput placeholder="Search products, SKU..." />
          </Suspense>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center p-12 glass-panel rounded-2xl text-slate-400">
          No products found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product as any} />
          ))}
        </div>
      )}
    </div>
  );
}
