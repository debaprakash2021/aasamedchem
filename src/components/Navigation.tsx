"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navigation() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session) return null;

  const role = (session.user as any)?.role;
  
  let links: { href: string; label: string }[] = [];
  
  if (role === "admin") {
    links = [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/users", label: "Users" },
      { href: "/admin/products", label: "Products" },
      { href: "/admin/inventory", label: "Inventory" },
      { href: "/admin/orders", label: "Orders" },
    ];
  } else if (role === "seller") {
    links = [
      { href: "/seller", label: "Dashboard" },
      { href: "/seller/my-products", label: "My Products" },
      { href: "/seller/inventory", label: "Inventory" },
      { href: "/seller/orders", label: "Orders" },
    ];
  } else if (role === "buyer") {
    links = [
      { href: "/buyer/browse", label: "Browse Products" },
      { href: "/buyer/cart", label: "Cart" },
      { href: "/buyer/my-orders", label: "My Orders" },
    ];
  }

  return (
    <nav className="border-b border-white/10 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-400">
              AasaMedChem
            </Link>
            <div className="hidden md:flex space-x-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === link.href || pathname.startsWith(link.href + '/')
                      ? "bg-indigo-500/20 text-indigo-300"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-400 hidden sm:block">
              <span className="text-slate-200">{session.user?.name}</span>
              <span className="mx-2 text-slate-600">|</span>
              <span className="uppercase text-xs font-semibold tracking-wider text-indigo-400">{role}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="px-3 py-1.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
