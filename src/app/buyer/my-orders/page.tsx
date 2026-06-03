import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { QuotationTable } from "@/components/QuotationTable";

export default async function BuyerOrdersPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string;

  const quotations = await prisma.quotation.findMany({
    where: { userId },
    include: {
      seller: { select: { businessName: true } },
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
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">My Orders</h1>
        <p className="text-slate-400">Track your order statuses and payment details.</p>
      </div>

      <QuotationTable quotations={quotations} role="BUYER" />
    </div>
  );
}
