"use server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function assertAdmin(session: any) {
  if (!session || session.user?.role !== "ADMIN") {
    throw new Error("Admin only");
  }
}

export async function updateUserStatus(
  userId: string,
  status: "ACTIVE" | "SUSPENDED"
) {
  const session = await getServerSession(authOptions);
  assertAdmin(session);
  await prisma.user.update({ where: { id: userId }, data: { status } });
  await prisma.auditLog.create({
    data: {
      userId: (session!.user as any).id,
      action: `SET_USER_${status}`,
      resourceType: "User",
      resourceId: userId,
      changes: { status },
    },
  });
  revalidatePath("/admin/users");
}

export async function adminOverrideQuotationStatus(
  quotationId: string,
  newStatus: string
) {
  const session = await getServerSession(authOptions);
  assertAdmin(session);
  const q = await prisma.quotation.findUnique({ where: { id: quotationId } });
  if (!q) throw new Error("Quotation not found");
  const updateData: any = { status: newStatus };
  if (newStatus === "APPROVED") updateData.approvedAt = new Date();
  if (newStatus === "COMPLETED") updateData.completedAt = new Date();
  await prisma.quotation.update({
    where: { id: quotationId },
    data: updateData,
  });
  await prisma.auditLog.create({
    data: {
      userId: (session!.user as any).id,
      action: "ADMIN_OVERRIDE_QUOTATION",
      resourceType: "Quotation",
      resourceId: quotationId,
      changes: { from: q.status, to: newStatus },
    },
  });
  revalidatePath("/admin/orders");
  revalidatePath("/seller/orders");
  revalidatePath("/buyer/my-orders");
}
