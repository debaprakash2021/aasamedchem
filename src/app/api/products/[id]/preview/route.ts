import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import UnitConversionService from "@/lib/services/UnitConversionService";

export async function GET(request: NextRequest, context: any) {
  try {
    const params = context.params || {};
    const searchParams = request.nextUrl.searchParams;
    const orderedUnit = searchParams.get("unit");
    const orderedQtyStr = searchParams.get("qty");

    if (!orderedUnit || !orderedQtyStr) {
      return NextResponse.json({ error: "Missing parameters: unit and qty required" }, { status: 400 });
    }

    const orderedQuantity = parseFloat(orderedQtyStr);

    if (isNaN(orderedQuantity) || orderedQuantity <= 0) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id }
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Use the UnitConversionService for accurate calculations
    const result = await UnitConversionService.getConversionDetails(
      product.id,
      orderedQuantity,
      orderedUnit
    );

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        basePrice: product.basePrice.toString(),
        baseUnit: result.baseUnit,
      },
      conversion: {
        orderedQuantity: result.orderedQuantity.toString(),
        orderedUnit: result.orderedUnit,
        baseQuantity: result.baseQuantity.toString(),
        conversionFactor: result.conversionFactor.toString(),
        unitPrice: result.unitPrice.toString(),
        lineTotal: result.lineTotal.toString(),
        gstAmount: result.gstAmount.toString(),
        finalTotal: result.finalTotal.toString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
