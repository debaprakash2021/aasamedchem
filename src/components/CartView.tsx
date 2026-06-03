"use client";
import { useState } from "react";
import { removeFromCart, checkoutCart } from "@/app/actions/cart";
import Link from "next/link";

type CartItem = {
  id: string;
  quantity: any;
  unitPrice: any;
  lineTotal: any;
  product: { id: string; name: string; sku: string; baseUnit: { code: string } };
  unit: { code: string };
};

export function CartView({ items }: { items: CartItem[] }) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [result, setResult] = useState<string[] | null>(null);
  const [err, setErr] = useState("");

  const total = items.reduce(
    (s, i) => s + parseFloat(i.lineTotal?.toString() ?? "0"),
    0
  );

  const handleRemove = async (itemId: string) => {
    setRemoving(itemId);
    try {
      await removeFromCart(itemId);
    } catch (e: any) {
      alert(e.message);
    }
    setRemoving(null);
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    setErr("");
    try {
      const quotNumbers = await checkoutCart();
      setResult(quotNumbers);
    } catch (e: any) {
      setErr(e.message ?? "Checkout failed");
    }
    setIsCheckingOut(false);
  };

  if (result) {
    return (
      <div className="glass-panel p-12 text-center rounded-2xl border-emerald-500/30 border">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
          ✓
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Order Placed!</h2>
        <p className="text-slate-400 mb-6">
          {result.length} quotation{result.length > 1 ? "s" : ""} created successfully:
        </p>
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {result.map((n) => (
            <span key={n} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg font-mono text-indigo-300">
              {n}
            </span>
          ))}
        </div>
        <Link href="/buyer/my-orders" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors">
          View My Orders
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="glass-panel p-12 text-center rounded-2xl">
        <p className="text-lg text-slate-400 mb-6">Your cart is empty.</p>
        <Link href="/buyer/browse" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="flex-1">
        <div className="glass-panel rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-900/50 text-slate-400 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium text-right">Qty</th>
                <th className="px-6 py-4 font-medium text-right">Unit Price</th>
                <th className="px-6 py-4 font-medium text-right">Total</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{item.product.name}</div>
                    <div className="text-xs text-slate-500">SKU: {item.product.sku}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {parseFloat(item.quantity?.toString() ?? "0").toFixed(4)}{" "}
                    <span className="text-slate-500">{item.unit.code}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    ₹{parseFloat(item.unitPrice?.toString() ?? "0").toFixed(6).replace(/\.?0+$/, "")}
                    /{item.unit.code}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-indigo-300">
                    ₹{parseFloat(item.lineTotal?.toString() ?? "0").toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleRemove(item.id)}
                      disabled={removing === item.id}
                      className="text-red-400 hover:text-red-300 text-xs font-medium px-2 py-1 bg-red-400/10 hover:bg-red-400/20 rounded transition-colors disabled:opacity-50"
                    >
                      {removing === item.id ? "…" : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="lg:w-96">
        <div className="glass-panel p-6 rounded-2xl sticky top-24">
          <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>
          
          <div className="space-y-4 mb-6 text-sm text-slate-300">
            <div className="flex justify-between">
              <span>Items ({items.length})</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
            <div className="text-xs text-slate-500 pb-4 border-b border-white/10">
              + GST will be calculated at checkout
            </div>
            <div className="flex justify-between items-center font-bold text-lg text-white">
              <span>Subtotal</span>
              <span className="text-indigo-400">₹{total.toFixed(2)}</span>
            </div>
          </div>

          {err && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {err}
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={isCheckingOut}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {isCheckingOut ? "Placing orders…" : "Checkout"}
          </button>
        </div>
      </div>
    </div>
  );
}
