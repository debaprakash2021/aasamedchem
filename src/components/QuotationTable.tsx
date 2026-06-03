"use client";
import { useState } from "react";
import { updateQuotationStatus } from "@/app/actions/order";

type QItem = {
  id: string;
  product: { name: string; sku: string };
  orderedQuantity: any;
  orderedUnit: { code: string };
  baseUnit: string;
  baseQuantity: any;
  unitPrice: any;
  lineTotal: any;
  gstApplied: any;
};

type Quotation = {
  id: string;
  quotationNumber: string;
  status: string;
  totalAmount: any;
  subtotal: any;
  taxAmount: any;
  createdAt: Date | string;
  buyer?: { name: string | null; email: string } | null;
  seller?: { businessName: string } | null;
  items: QItem[];
};

const STATUS_STYLE: Record<string, string> = {
  DRAFT:     "bg-slate-500/20 text-slate-400 border-slate-500/30",
  SUBMITTED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  REVIEWED:  "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  APPROVED:  "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  PAID:      "bg-purple-500/20 text-purple-400 border-purple-500/30",
  COMPLETED: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
  REJECTED:  "bg-red-700/20 text-red-300 border-red-700/30",
};

const NEXT_STATUSES: Record<string, string[]> = {
  SUBMITTED: ["REVIEWED", "REJECTED"],
  REVIEWED:  ["APPROVED", "REJECTED"],
  APPROVED:  ["PAID"],
  PAID:      ["COMPLETED"],
};

export function QuotationTable({
  quotations,
  role,
}: {
  quotations: Quotation[];
  role: "SELLER" | "ADMIN" | "BUYER";
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const doUpdate = async (qId: string, newStatus: string) => {
    setUpdating(qId);
    try {
      await updateQuotationStatus(qId, newStatus);
    } catch (err: any) {
      alert(err.message ?? "Update failed");
    }
    setUpdating(null);
  };

  const handlePrint = (e: React.MouseEvent, qId: string) => {
    e.stopPropagation();
    setExpanded(qId);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  if (quotations.length === 0) {
    return (
      <div className="text-center p-12 glass-panel rounded-2xl text-slate-400">
        No quotations found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {quotations.map((q) => {
        const total = parseFloat(q.totalAmount?.toString() ?? "0");
        const date = new Date(q.createdAt).toLocaleDateString("en-IN", {
          day: "numeric", month: "short", year: "numeric",
        });
        const actions = NEXT_STATUSES[q.status] ?? [];
        const isExpanded = expanded === q.id;

        return (
          <div key={q.id} className={`glass-panel rounded-2xl overflow-hidden border border-white/5 ${isExpanded ? "print:block print:absolute print:inset-0 print:bg-white print:text-black print:z-50 print:p-8" : "print:hidden"}`}>
            <div
              className="flex flex-col sm:flex-row sm:items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors gap-4 print:hidden"
              onClick={() => setExpanded(isExpanded ? null : q.id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-mono font-bold text-white text-lg">{q.quotationNumber}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLE[q.status] ?? "bg-white/10 text-slate-400"}`}>
                    {q.status}
                  </span>
                </div>
                <div className="text-sm text-slate-400 flex items-center gap-2">
                  {role !== "BUYER" && q.buyer && (
                    <span>Buyer: {q.buyer.name ?? q.buyer.email}</span>
                  )}
                  {role === "BUYER" && q.seller && (
                    <span>Seller: {q.seller.businessName}</span>
                  )}
                </div>
              </div>

              <div className="text-right flex flex-col items-end gap-2">
                <div>
                  <p className="text-xl font-bold text-indigo-400">₹{total.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">{date}</p>
                </div>
                <button
                  onClick={(e) => handlePrint(e, q.id)}
                  className="px-3 py-1 rounded text-xs border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-1 print:hidden"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Invoice PDF
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="p-5 bg-black/20 border-t border-white/5 print:bg-transparent print:border-none print:text-black">
                
                {/* Print Header */}
                <div className="hidden print:block mb-8 border-b pb-6 border-slate-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 mb-1">AasaMedChem</h1>
                      <p className="text-sm text-slate-600">Official Invoice</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-xl font-bold text-slate-800">{q.quotationNumber}</h2>
                      <p className="text-sm text-slate-600">Date: {date}</p>
                      <p className="text-sm text-slate-600 mt-1 font-medium">{q.status}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between mt-8">
                    <div>
                      <h3 className="text-xs font-bold uppercase text-slate-500 mb-1">Billed To</h3>
                      <p className="text-sm font-medium text-slate-800">{q.buyer?.name ?? q.buyer?.email ?? "N/A"}</p>
                    </div>
                    {q.seller && (
                      <div className="text-right">
                        <h3 className="text-xs font-bold uppercase text-slate-500 mb-1">From Seller</h3>
                        <p className="text-sm font-medium text-slate-800">{q.seller.businessName}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-left text-sm text-slate-300 print:text-slate-800">
                    <thead className="text-xs uppercase text-slate-500 border-b border-white/10 print:border-slate-300">
                      <tr>
                        <th className="py-2 px-4 font-medium">Product</th>
                        <th className="py-2 px-4 font-medium text-right">Ordered</th>
                        <th className="py-2 px-4 font-medium text-right">Base Qty</th>
                        <th className="py-2 px-4 font-medium text-right">Unit Price</th>
                        <th className="py-2 px-4 font-medium text-right">Subtotal</th>
                        <th className="py-2 px-4 font-medium text-right">GST</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {q.items.map((item) => {
                        const oq = parseFloat(item.orderedQuantity?.toString() ?? "0");
                        const bq = parseFloat(item.baseQuantity?.toString() ?? "0");
                        const up = parseFloat(item.unitPrice?.toString() ?? "0");
                        const lt = parseFloat(item.lineTotal?.toString() ?? "0");
                        const gst = parseFloat(item.gstApplied?.toString() ?? "0");

                        return (
                          <tr key={item.id} className="hover:bg-white/5 print:border-b print:border-slate-200">
                            <td className="py-3 px-4">
                              <div className="font-medium text-white print:text-slate-900">{item.product.name}</div>
                              <div className="text-xs text-slate-500">SKU: {item.product.sku}</div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {oq.toFixed(4)} <span className="text-slate-500">{item.orderedUnit.code}</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {bq.toFixed(6)} <span className="text-slate-500">{item.baseUnit}</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              ₹{up.toFixed(6).replace(/\.?0+$/, "")}/{item.orderedUnit.code}
                            </td>
                            <td className="py-3 px-4 text-right font-medium">₹{lt.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right text-slate-400">₹{gst.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-end gap-6 border-t border-white/10 print:border-slate-300 pt-4">
                  {role !== "BUYER" && actions.length > 0 ? (
                    <div className="flex flex-wrap gap-2 print:hidden">
                      {actions.map((action) => {
                        const isDanger = action === "REJECTED" || action === "CANCELLED";
                        return (
                          <button
                            key={action}
                            disabled={updating === q.id}
                            onClick={() => doUpdate(q.id, action)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                              isDanger
                                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                                : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
                            }`}
                          >
                            {updating === q.id ? "Updating…" : `Mark as ${action}`}
                          </button>
                        );
                      })}
                    </div>
                  ) : <div className="print:hidden" />}

                  <div className="w-64 space-y-2 text-sm text-slate-300 print:text-slate-700">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>₹{parseFloat(q.subtotal?.toString() ?? "0").toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (GST)</span>
                      <span>₹{parseFloat(q.taxAmount?.toString() ?? "0").toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg text-white print:text-slate-900 border-t border-white/10 print:border-slate-300 pt-2 mt-2">
                      <span>Total</span>
                      <span className="text-indigo-400 print:text-slate-900">₹{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
