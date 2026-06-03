"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useCallback } from "react";

export function SearchInput({
  placeholder = "Search…",
  paramName = "q",
}: {
  placeholder?: string;
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(paramName) ?? "");
  
  const push = useCallback(
    (val: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (val) params.set(paramName, val);
      else params.delete(paramName);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams, paramName]
  );
  
  return (
    <div className="relative w-full max-w-md">
      <svg className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          const t = setTimeout(() => push(e.target.value), 400);
          return () => clearTimeout(t);
        }}
        onKeyDown={(e) => e.key === "Enter" && push(value)}
        placeholder={placeholder}
        className="w-full glass-input pl-10 pr-4 py-2 rounded-lg text-sm bg-slate-900/50"
      />
    </div>
  );
}
