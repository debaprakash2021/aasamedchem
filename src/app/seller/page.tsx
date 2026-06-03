import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function SellerDashboard() {
  const session = await getServerSession(authOptions);
  const sellerId = (session?.user as any)?.sellerId as string;

  if (!sellerId) {
    return (
      <div className="p-8 text-center glass-panel rounded-2xl border-red-500/30 border mt-10">
        <h1 className="text-2xl text-red-400 font-bold mb-2">Error</h1>
        <p className="text-slate-400">Seller profile not found. Contact admin.</p>
      </div>
    );
  }

  const [productsCount, pendingCount, approvedCount, revenueResult] =
    await Promise.all([
      prisma.product.count({
        where: { sellerId, status: { not: "DISCONTINUED" } },
      }),
      prisma.quotation.count({
        where: { sellerId, status: { in: ["SUBMITTED", "REVIEWED"] } },
      }),
      prisma.quotation.count({
        where: { sellerId, status: { in: ["APPROVED", "PAID", "COMPLETED"] } },
      }),
      prisma.quotation.aggregate({
        where: { sellerId, status: { in: ["PAID", "COMPLETED"] } },
        _sum: { totalAmount: true },
      }),
    ]);

  const revenue = revenueResult._sum.totalAmount?.toNumber() ?? 0;

  const stats = [
    { label: "Active Products", value: productsCount, color: "indigo", href: "/seller/my-products" },
    { label: "Pending Orders", value: pendingCount, color: "yellow", href: "/seller/orders" },
    { label: "Fulfilled Orders", value: approvedCount, color: "emerald", href: "/seller/orders" },
    { label: "Revenue (₹)", value: `₹${revenue.toFixed(2)}`, color: "blue", href: "#" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Seller Dashboard</h1>
        <p className="text-slate-400">Manage your catalog, inventory, and track your performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link href={stat.href} key={stat.label} className={`glass-panel p-6 rounded-2xl hover:border-${stat.color}-500/30 transition-all border border-white/5 flex flex-col justify-between h-32`}>
            <span className="text-sm text-slate-400 font-medium">{stat.label}</span>
            <span className={`text-3xl font-bold text-${stat.color}-400`}>{stat.value}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
