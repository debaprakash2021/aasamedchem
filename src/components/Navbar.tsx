"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/register") return null;

  const role = (session?.user as any)?.role || "GUEST";

  const links = {
    ADMIN: [
      { name: "Activity", href: "/admin/activity" },
      { name: "Orders", href: "/admin/orders" },
    ],
    SELLER: [
      { name: "Dashboard", href: "/seller" },
      { name: "My Products", href: "/seller/my-products" },
      { name: "Inventory", href: "/seller/inventory" },
      { name: "Orders", href: "/seller/orders" },
    ],
    BUYER: [
      { name: "Browse", href: "/browse" },
      { name: "Cart", href: "/buyer/cart" },
      { name: "My Orders", href: "/buyer/my-orders" },
    ],
    GUEST: [
      { name: "Browse", href: "/browse" },
    ]
  };

  const navLinks = links[role as keyof typeof links] || [];

  return (
    <nav className="print:hidden sticky top-0 z-40 w-full backdrop-blur-md bg-slate-950/80 border-b border-white/5 mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center h-auto sm:h-16 py-4 sm:py-0 gap-4 sm:gap-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
            <Link href="/" className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-400">
              AasaMedChem
            </Link>
            
            <div className="flex flex-wrap items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? "bg-indigo-500/10 text-indigo-400" 
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4 justify-between sm:justify-end w-full sm:w-auto">
            {session ? (
              <>
                <div className="text-sm text-slate-400 flex items-center gap-2">
                  <span className="hidden sm:inline">{session.user?.email}</span>
                  <span className="px-2 py-0.5 rounded text-xs border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                    {role}
                  </span>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition-colors whitespace-nowrap"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
                >
                  Log In
                </Link>
                <Link
                  href="/register?role=BUYER"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-slate-900 hover:bg-slate-200 transition-colors whitespace-nowrap"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
