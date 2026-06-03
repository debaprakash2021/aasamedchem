import { prisma } from "@/lib/prisma";

export default class UnitConversionService {
  static async getConversionDetails(productId: string, orderedQuantity: number, orderedUnitCode: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { baseUnit: true }
    });

    if (!product) throw new Error("Product not found");

    let factor = 1;

    if (orderedUnitCode !== product.baseUnit.code) {
      const conversion = await prisma.conversionFactor.findFirst({
        where: {
          productId,
          fromUnitId: product.baseUnitId,
          toUnit: { code: orderedUnitCode }
        }
      });
      if (!conversion) {
        throw new Error(`Conversion from ${product.baseUnit.code} to ${orderedUnitCode} not supported for this product.`);
      }
      factor = parseFloat(conversion.factor.toString());
    }

    const baseQuantity = orderedQuantity * factor;
    const basePrice = parseFloat(product.basePrice.toString());
    const unitPrice = basePrice * factor;
    
    const lineTotal = orderedQuantity * unitPrice;
    const gstRate = parseFloat(product.gstRate.toString());
    const gstAmount = lineTotal * (gstRate / 100);
    const finalTotal = lineTotal + gstAmount;

    return {
      orderedQuantity,
      orderedUnit: orderedUnitCode,
      baseQuantity,
      baseUnit: product.baseUnit.code,
      conversionFactor: factor,
      unitPrice,
      lineTotal,
      gstRate,
      gstAmount,
      finalTotal,
    };
  }

  static async checkInventory(productId: string, requiredBaseQuantity: number) {
    const inv = await prisma.inventory.findUnique({ where: { productId } });
    const available = inv ? parseFloat(inv.quantity.toString()) : 0;
    
    return {
      canFulfill: available >= requiredBaseQuantity,
      available,
      required: requiredBaseQuantity,
    };
  }
}
