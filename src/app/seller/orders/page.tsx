import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { QuotationTable } from "@/components/QuotationTable";

export default async function SellerOrdersPage() {
  const session = await getServerSession(authOptions);
  const sellerId = (session?.user as any)?.sellerId as string;

  const quotations = await prisma.quotation.findMany({
    where: { sellerId },
    include: {
      buyer: { select: { name: true, email: true } },
      items: {
        include: {
          product: { select: { name: true, sku: true } },
          orderedUnit: { select: { code: true } }
        }
      }
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Order Management</h1>
        <p className="text-slate-400">Manage customer orders and update fulfillment status.</p>
      </div>

      <QuotationTable quotations={quotations} role="SELLER" />
    </div>
  );
}
