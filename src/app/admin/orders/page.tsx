import { prisma } from "@/lib/prisma";
import { QuotationTable } from "@/components/QuotationTable";
import { CsvExportButton } from "@/components/CsvExportButton";

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

  const exportData = quotations.map(q => ({
    quotationNumber: q.quotationNumber,
    date: q.createdAt.toLocaleDateString(),
    buyerEmail: q.buyer.email,
    sellerName: q.seller.businessName,
    status: q.status,
    totalAmount: q.totalAmount.toString()
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">System Orders</h1>
          <p className="text-slate-400">Global overview of all quotations and transactions.</p>
        </div>
        <CsvExportButton data={exportData} />
      </div>

      <QuotationTable quotations={quotations as any} role="ADMIN" />
    </div>
  );
}
