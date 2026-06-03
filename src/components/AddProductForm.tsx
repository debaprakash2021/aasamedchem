"use client";

import { useState } from "react";
import { createProduct } from "@/app/actions/product";

const UNITS = ["g", "kg", "L", "mL", "item"];

export function AddProductForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [baseUnit, setBaseUnit] = useState("kg");
  const [conversionFactors, setConversionFactors] = useState<Record<string, number>>({ kg: 1, g: 0.001 });

  const handleUnitToggle = (unit: string, checked: boolean) => {
    if (unit === baseUnit) return;
    const newFactors = { ...conversionFactors };
    if (checked) {
      if (baseUnit === 'kg' && unit === 'g') newFactors['g'] = 0.001;
      else if (baseUnit === 'g' && unit === 'kg') newFactors['kg'] = 1000;
      else if (baseUnit === 'L' && unit === 'mL') newFactors['mL'] = 0.001;
      else newFactors[unit] = 1;
    } else {
      delete newFactors[unit];
    }
    setConversionFactors(newFactors);
  };

  const updateMultiplier = (unit: string, val: string) => {
    setConversionFactors({ ...conversionFactors, [unit]: parseFloat(val) || 0 });
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20"
      >
        + New Product
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-indigo-500/30">
            <h2 className="text-xl font-bold mb-4 text-white">Create Product</h2>
            <form action={async (formData) => {
              formData.append("conversionFactors", JSON.stringify(conversionFactors));
              await createProduct(formData);
              setIsOpen(false);
            }} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Name</label>
                <input name="name" required className="w-full glass-input px-3 py-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Description</label>
                <textarea name="description" className="w-full glass-input px-3 py-2 rounded-lg" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm text-slate-300 mb-1">Base Unit</label>
                  <select 
                    name="baseUnit" 
                    value={baseUnit}
                    onChange={(e) => {
                      setBaseUnit(e.target.value);
                      setConversionFactors({ [e.target.value]: 1 });
                    }}
                    className="w-full glass-input px-3 py-2 rounded-lg bg-slate-900"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-slate-300 mb-1">Base Price (₹ per {baseUnit})</label>
                  <input name="basePrice" type="number" step="0.01" required className="w-full glass-input px-3 py-2 rounded-lg" />
                </div>
              </div>

              {/* Conversion Factors Logic */}
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-sm font-medium mb-2 text-indigo-300">Supported Units & Conversion</p>
                <p className="text-xs text-slate-400 mb-3">Multiplier to convert THIS unit to BASE ({baseUnit})</p>
                <div className="space-y-2">
                  {UNITS.map(u => (
                    <div key={u} className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        disabled={u === baseUnit}
                        checked={u === baseUnit || u in conversionFactors}
                        onChange={(e) => handleUnitToggle(u, e.target.checked)}
                      />
                      <span className="w-8 text-sm">{u}</span>
                      {(u === baseUnit || u in conversionFactors) && (
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-xs text-slate-500">=</span>
                          <input 
                            type="number" 
                            step="any"
                            disabled={u === baseUnit}
                            value={conversionFactors[u] || ''}
                            onChange={(e) => updateMultiplier(u, e.target.value)}
                            className="w-full glass-input px-2 py-1 rounded text-sm disabled:opacity-50"
                          />
                          <span className="text-xs text-slate-500">{baseUnit}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-white/5">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
