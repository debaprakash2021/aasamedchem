"use client";

import { useState, useEffect } from "react";
import { placeOrder } from "@/app/actions/order";

export function ProductCard({ product }: { product: any }) {
  const supportedUnits = Object.keys(product.conversionFactors);
  const [selectedUnit, setSelectedUnit] = useState(supportedUnits[0] || product.baseUnit);
  const [quantity, setQuantity] = useState<number>(1);
  const [preview, setPreview] = useState<{ unitPrice: number, lineTotal: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOrdering, setIsOrdering] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      if (!quantity || quantity <= 0) return;
      setIsLoading(true);
      try {
        const res = await fetch(`/api/products/${product.id}/preview?unit=${selectedUnit}&qty=${quantity}`);
        const data = await res.json();
        if (res.ok) {
          setPreview(data);
          setError("");
        } else {
          setError(data.error || "Failed to calculate");
        }
      } catch (err) {
        setError("Network error");
      }
      setIsLoading(false);
    };

    const debounce = setTimeout(fetchPreview, 300);
    return () => clearTimeout(debounce);
  }, [product.id, selectedUnit, quantity]);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsOrdering(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("productId", product.id);
      formData.append("orderedUnit", selectedUnit);
      formData.append("orderedQuantity", quantity.toString());

      await placeOrder(formData);
      alert("Order placed successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to place order. Check inventory.");
    }
    setIsOrdering(false);
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-indigo-500/30 transition-all flex flex-col h-full relative overflow-hidden">
      <div className="absolute top-0 right-0 px-3 py-1 bg-white/5 rounded-bl-xl text-xs text-slate-400 border-b border-l border-white/5">
        Stock: {product.inventory ? product.inventory.quantity : "0"} {product.baseUnit}
      </div>
      
      <h3 className="text-xl font-bold text-white mb-1 pr-16">{product.name}</h3>
      <p className="text-sm text-slate-400 mb-6 flex-1">{product.description}</p>
      
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
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
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
              {supportedUnits.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400">Unit Price</span>
            <span className="text-sm font-medium text-slate-300">
              {isLoading ? "..." : preview ? `₹${preview.unitPrice.toFixed(4)}` : "₹0.00"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-300">Total Amount</span>
            <span className="text-lg font-bold text-indigo-400">
              {isLoading ? "Calculating..." : preview ? `₹${preview.lineTotal.toFixed(2)}` : "₹0.00"}
            </span>
          </div>
          {error && <p className="text-xs text-red-400 mt-2 bg-red-500/10 p-2 rounded border border-red-500/20">{error}</p>}
        </div>

        <button 
          type="submit"
          disabled={isOrdering || isLoading || !!error || !preview}
          className="w-full py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {isOrdering ? "Processing..." : "Place Order"}
        </button>
      </form>
    </div>
  );
}
