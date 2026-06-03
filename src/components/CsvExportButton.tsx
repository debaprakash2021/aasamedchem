"use client";

type OrderData = {
  quotationNumber: string;
  status: string;
  totalAmount: string;
  buyerEmail: string;
  sellerName: string;
  date: string;
};

export function CsvExportButton({ data }: { data: OrderData[] }) {
  const downloadCsv = () => {
    if (data.length === 0) return;
    
    const headers = ["Order ID", "Date", "Buyer Email", "Seller Name", "Status", "Total Amount (INR)"];
    
    const rows = data.map(order => [
      order.quotationNumber,
      order.date,
      order.buyerEmail,
      order.sellerName,
      order.status,
      order.totalAmount
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.map(field => `"${field}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `AasaMedChem_Orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={downloadCsv}
      className="px-4 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-500/10 flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
      Export CSV
    </button>
  );
}
