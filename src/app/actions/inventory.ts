"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function updateInventory(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "SELLER") {
    throw new Error("Unauthorized");
  }

  throw new Error("Inventory update - phase 2 implementation");
}
