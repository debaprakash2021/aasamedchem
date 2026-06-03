import { prisma } from "@/lib/prisma";
import { QuotationTable } from "@/components/QuotationTable";

export default async function AdminOrdersPage() {
  const quotations = await prisma.quotation.findMany({
    include: {
      buyer: { select: { name: true, email: true } },
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">System Orders</h1>
        <p className="text-slate-400">Global overview of all quotations and transactions.</p>
      </div>

      <QuotationTable quotations={quotations} role="ADMIN" />
    </div>
  );
}
