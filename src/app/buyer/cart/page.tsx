import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CartView } from "@/components/CartView";

export default async function BuyerCartPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string;

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, baseUnit: { select: { code: true } } } },
          unit: { select: { code: true } }
        },
        orderBy: { productId: "asc" }
      }
    }
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Your Cart</h1>
        <p className="text-slate-400">Review your items and proceed to checkout to request quotations.</p>
      </div>

      <CartView items={cart?.items ?? []} />
    </div>
  );
}
