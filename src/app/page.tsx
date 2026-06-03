import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  
  if (session) {
    const role = (session.user as any)?.role;
    if (role === "ADMIN") redirect("/admin");
    if (role === "SELLER") redirect("/seller");
    if (role === "BUYER") redirect("/browse");
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-2xl mb-12">
        <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-400 mb-6">
          AasaMedChem
        </h1>
        <p className="text-lg text-slate-300">
          The premier B2B platform for pharmaceutical inventory and order management. 
          Are you looking to procure medical supplies, or sell your inventory?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <Link href="/browse" className="group glass-panel p-8 rounded-3xl border border-indigo-500/20 hover:border-indigo-400 hover:bg-indigo-500/5 transition-all text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">I am a Buyer</h2>
          <p className="text-slate-400 text-sm mb-6">Browse the catalog, add products to your cart, and place orders directly from verified sellers.</p>
          <span className="text-indigo-400 text-sm font-semibold uppercase tracking-wider group-hover:underline">Start Browsing →</span>
        </Link>

        <Link href="/register?role=SELLER" className="group glass-panel p-8 rounded-3xl border border-emerald-500/20 hover:border-emerald-400 hover:bg-emerald-500/5 transition-all text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">I am a Seller</h2>
          <p className="text-slate-400 text-sm mb-6">List your API and formulations, manage inventory across units, and fulfill bulk orders.</p>
          <span className="text-emerald-400 text-sm font-semibold uppercase tracking-wider group-hover:underline">Register to Sell →</span>
        </Link>
      </div>
    </div>
  );
}
