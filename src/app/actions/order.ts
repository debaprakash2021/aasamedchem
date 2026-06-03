"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function placeOrder(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "BUYER") {
    throw new Error("Unauthorized");
  }

  throw new Error("Quotation system - phase 2 implementation");
}
