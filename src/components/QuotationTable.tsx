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
          <div key={q.id} className="glass-panel rounded-2xl overflow-hidden border border-white/5">
            <div
              className="flex flex-col sm:flex-row sm:items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors gap-4"
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

              <div className="text-right">
                <p className="text-xl font-bold text-indigo-400">₹{total.toFixed(2)}</p>
                <p className="text-xs text-slate-500">{date}</p>
              </div>
            </div>

            {isExpanded && (
              <div className="p-5 bg-black/20 border-t border-white/5">
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="text-xs uppercase text-slate-500 border-b border-white/10">
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
                          <tr key={item.id} className="hover:bg-white/5">
                            <td className="py-3 px-4">
                              <div className="font-medium text-white">{item.product.name}</div>
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

                <div className="flex flex-col sm:flex-row justify-between items-end gap-6 border-t border-white/10 pt-4">
                  {role !== "BUYER" && actions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
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
                  ) : <div />}

                  <div className="w-64 space-y-2 text-sm text-slate-300">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>₹{parseFloat(q.subtotal?.toString() ?? "0").toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (GST)</span>
                      <span>₹{parseFloat(q.taxAmount?.toString() ?? "0").toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg text-white border-t border-white/10 pt-2 mt-2">
                      <span>Total</span>
                      <span className="text-indigo-400">₹{total.toFixed(2)}</span>
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
