import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ActivityFeed } from "@/components/ActivityFeed";

export default async function ActivityPage() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") redirect("/login");

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: {
        select: { email: true, role: true }
      }
    }
  });

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <h1 className="text-3xl font-bold text-white mb-2">Global Activity Feed</h1>
      <p className="text-slate-400 mb-8">Real-time system events and audit logs.</p>
      
      <ActivityFeed logs={logs as any} />
    </div>
  );
}
