import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role === "ADMIN") {
      return NextResponse.json({ error: "Cannot suspend other admins" }, { status: 403 });
    }

    const newStatus = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    
    await prisma.user.update({
      where: { id },
      data: { status: newStatus }
    });

    await prisma.auditLog.create({
      data: {
        userId: session!.user.id as string,
        action: newStatus === "SUSPENDED" ? "SUSPEND_USER" : "ACTIVATE_USER",
        resourceType: "User",
        resourceId: id,
      }
    });

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("Error toggling user status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
