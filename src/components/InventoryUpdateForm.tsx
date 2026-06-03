"use client";
import { useState } from "react";
import { updateInventory } from "@/app/actions/inventory";

type Props = {
  product: {
    id: string;
    name: string;
    sku: string;
    baseUnit: string;
    currentStock: string;
    reorderLevel: string;
  };
};

export function InventoryUpdateForm({ product }: Props) {
  const stock = parseFloat(product.currentStock) || 0;
  const reorder = parseFloat(product.reorderLevel) || 0;
  const [quantity, setQuantity] = useState(stock);
  const [isUpdating, setIsUpdating] = useState(false);
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("productId", product.id);
      fd.append("quantity", quantity.toString());
      await updateInventory(fd);
      setMsg({ type: "ok", text: "Updated!" });
    } catch (err: any) {
      setMsg({ type: "err", text: err.message ?? "Failed" });
    }
    setIsUpdating(false);
    setTimeout(() => setMsg(null), 2500);
  };
  
  const isLow = stock > 0 && stock <= reorder;
  const isEmpty = stock === 0;
  
  return (
    <form onSubmit={handleSubmit} className="flex items-center justify-end gap-4">
      <div className="flex flex-col text-right">
        {isEmpty && <span className="text-xs text-red-400 font-bold uppercase">Out of Stock</span>}
        {isLow && !isEmpty && <span className="text-xs text-yellow-400 font-bold uppercase">Low Stock</span>}
        <p className="text-xs text-slate-400">
          Current: {stock.toFixed(4)} {product.baseUnit}
        </p>
        {reorder > 0 && (
          <p className="text-xs text-slate-500">
            Reorder at {reorder.toFixed(2)} {product.baseUnit}
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="any"
          min="0"
          value={quantity}
          onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
          className="w-24 glass-input px-3 py-2 rounded-lg text-sm text-right"
        />
        <span className="text-sm font-medium w-8">{product.baseUnit}</span>
        
        <button type="submit" disabled={isUpdating} className="ml-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors">
          {isUpdating ? "…" : msg?.type === "ok" ? "✓" : "Update"}
        </button>
      </div>
      
      {msg?.type === "err" && (
        <span className="text-xs text-red-400 ml-2">{msg.text}</span>
      )}
    </form>
  );
}
