import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, context: any) {
  const params = context.params || {};
  const searchParams = request.nextUrl.searchParams;
  const orderedUnit = searchParams.get("unit");
  const orderedQtyStr = searchParams.get("qty");

  if (!orderedUnit || !orderedQtyStr) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const orderedQuantity = parseFloat(orderedQtyStr);

  const product = await prisma.product.findUnique({
    where: { id: params.id }
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const conversionFactors = product.conversionFactors as Record<string, number>;
  
  if (!(orderedUnit in conversionFactors)) {
    return NextResponse.json({ error: "Unit not supported" }, { status: 400 });
  }

  const multiplier = conversionFactors[orderedUnit];
  
  const basePrice = parseFloat(product.basePrice.toString());
  const unitPrice = basePrice * multiplier;
  const lineTotal = orderedQuantity * unitPrice;
  const roundedTotal = Math.round(lineTotal * 100) / 100;

  return NextResponse.json({
    unitPrice: unitPrice,
    lineTotal: roundedTotal,
    baseQuantity: orderedQuantity * multiplier
  });
}
