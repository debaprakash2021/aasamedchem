"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { addToCart } from "@/app/actions/cart";

type SupportedUnit = { id: string; code: string; name: string };

type ProductCardProps = {
  product: {
    id: string;
    name: string;
    description?: string | null;
    sku: string;
    basePrice: any;
    baseUnit: { code: string; name: string };
    supportedUnits: SupportedUnit[];
    inventory?: { quantity: any } | null;
    seller?: { businessName: string } | null;
  };
};

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const supportedUnits = product.supportedUnits.map((u) => u.code);
  const [selectedUnit, setSelectedUnit] = useState(
    supportedUnits[0] ?? product.baseUnit.code
  );
  const [quantity, setQuantity] = useState(1);
  const [preview, setPreview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderMsg, setOrderMsg] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => {
    if (!quantity || quantity <= 0) return;
    setIsLoading(true);
    setFetchError("");
    
    const id = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/products/${product.id}/preview?unit=${selectedUnit}&qty=${quantity}`
        );
        const data = await res.json();
        if (res.ok) {
          setPreview(data);
          setFetchError("");
        } else {
          setFetchError(data.error ?? "Failed to calculate price");
          setPreview(null);
        }
      } catch {
        setFetchError("Network error");
        setPreview(null);
      }
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(id);
  }, [product.id, selectedUnit, quantity]);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      router.push("/login?callbackUrl=/browse");
      return;
    }
    setIsOrdering(true);
    setOrderMsg(null);
    try {
      const fd = new FormData();
      fd.append("productId", product.id);
      fd.append("unit", selectedUnit);
      fd.append("quantity", quantity.toString());
      await addToCart(fd);
      setOrderMsg({
        type: "ok",
        text: `✓ Added to Cart!`,
      });
    } catch (err: any) {
      setOrderMsg({ type: "err", text: err.message ?? "Add failed" });
    }
    setIsOrdering(false);
    if (orderMsg?.type === "ok") setTimeout(() => setOrderMsg(null), 3000);
  };

  const stockQty = product.inventory
    ? parseFloat(product.inventory.quantity.toString())
    : 0;
  const hasStock = stockQty > 0;
  const basePrice = parseFloat(product.basePrice.toString());

  return (
    <div className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-indigo-500/30 transition-all flex flex-col h-full relative overflow-hidden">
      <div
        className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-xs border-b border-l ${
          hasStock
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : "bg-red-500/10 text-red-400 border-red-500/20"
        }`}
      >
        {hasStock ? `${stockQty.toFixed(2)} ${product.baseUnit.code}` : "Out of stock"}
      </div>

      <h3 className="text-xl font-bold text-white mb-1 pr-16">{product.name}</h3>
      {product.seller && <p className="text-xs text-indigo-400 mb-2">{product.seller.businessName}</p>}
      <p className="text-sm text-slate-400 mb-4 flex-1">{product.description}</p>
      
      <div className="mb-4 text-xs text-slate-500 flex justify-between">
        <span>Base: ₹{basePrice.toFixed(2)}/{product.baseUnit.code}</span>
        <span>SKU: {product.sku}</span>
      </div>

      <form onSubmit={handleOrder} className="mt-auto space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1">Quantity</label>
            <input
              type="number"
              step="any"
              min="0.0001"
              required
              value={quantity}
              onChange={(e) => setQuantity(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full glass-input px-3 py-2 rounded-lg text-sm bg-slate-900/50"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1">Unit</label>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-lg text-sm bg-slate-900"
            >
              {supportedUnits.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Unit price</span>
            <span className="font-medium text-slate-300">
              {isLoading ? "…" : preview ? `₹${parseFloat(preview.unitPrice).toFixed(6).replace(/\.?0+$/, "")}/${selectedUnit}` : "—"}
            </span>
          </div>
          
          {preview && (
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>In base ({product.baseUnit.code})</span>
              <span>{parseFloat(preview.baseQuantity).toFixed(4)} {product.baseUnit.code}</span>
            </div>
          )}
          
          {preview && (
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>GST (5%)</span>
              <span>₹{parseFloat(preview.gstAmount).toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-white/10">
            <span className="text-sm font-bold text-slate-300">Total (incl. GST)</span>
            <span className="text-lg font-bold text-indigo-400">
              {isLoading ? "…" : preview ? `₹${parseFloat(preview.finalTotal).toFixed(2)}` : "₹0.00"}
            </span>
          </div>
        </div>

        {fetchError && (
          <p className="text-xs text-red-400 mt-2 bg-red-500/10 p-2 rounded border border-red-500/20">{fetchError}</p>
        )}

        <button
          type="submit"
          disabled={isOrdering || isLoading || !!fetchError || !preview || !hasStock}
          className="w-full py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {isOrdering ? "Placing…" : !hasStock ? "Out of Stock" : "Add to Cart"}
        </button>

        {orderMsg && (
          <p className={`text-xs p-2 rounded text-center font-medium ${
            orderMsg.type === "ok"
              ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
              : "text-red-400 bg-red-500/10 border border-red-500/20"
          }`}>
            {orderMsg.text}
          </p>
        )}
      </form>
    </div>
  );
}
