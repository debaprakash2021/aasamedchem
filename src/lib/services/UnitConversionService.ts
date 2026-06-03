import { Decimal } from "@prisma/client/runtime/library";
import prisma from "@/lib/prisma";

export interface ConversionResult {
  baseUnit: string;
  baseQuantity: Decimal;
  orderedUnit: string;
  orderedQuantity: Decimal;
  conversionFactor: Decimal;
  unitPrice: Decimal;
  lineTotal: Decimal;
  gstRate: Decimal | null;
  gstAmount: Decimal;
  finalTotal: Decimal;
}

export class UnitConversionService {
  /**
   * Get all conversion factors for a product
   * Returns a map of unit code to conversion factor
   */
  static async getConversionFactors(productId: string): Promise<Record<string, Decimal>> {
    const factors: Record<string, Decimal> = {};

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        baseUnit: true,
        conversions: {
          include: { toUnit: true },
        },
      },
    });

    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    // Add base unit with factor 1
    factors[product.baseUnit.code] = new Decimal(1);

    // Add all conversion factors
    for (const conversion of product.conversions) {
      factors[conversion.toUnit.code] = conversion.factor;
    }

    return factors;
  }

  /**
   * Calculate the quantity in base units
   * Formula: orderedQty × conversionFactor
   */
  static calculateBaseQuantity(
    orderedQuantity: Decimal | number,
    conversionFactor: Decimal | number
  ): Decimal {
    const qty = new Decimal(orderedQuantity);
    const factor = new Decimal(conversionFactor);
    return qty.multiply(factor);
  }

  /**
   * Calculate unit price for ordered unit
   * Formula: basePrice × conversionFactor
   */
  static calculateUnitPrice(
    basePrice: Decimal | number,
    conversionFactor: Decimal | number
  ): Decimal {
    const price = new Decimal(basePrice);
    const factor = new Decimal(conversionFactor);
    return price.multiply(factor).toDecimalPlaces(6);
  }

  /**
   * Calculate line total
   * Formula: orderedQty × unitPrice, rounded to 2 decimals
   */
  static calculateLineTotal(
    orderedQuantity: Decimal | number,
    unitPrice: Decimal | number
  ): Decimal {
    const qty = new Decimal(orderedQuantity);
    const price = new Decimal(unitPrice);
    return qty.multiply(price).toDecimalPlaces(2);
  }

  /**
   * Calculate GST amount
   */
  static calculateGST(
    amount: Decimal | number,
    gstRate: Decimal | number | null
  ): Decimal {
    if (!gstRate || gstRate === 0) {
      return new Decimal(0);
    }
    const baseAmount = new Decimal(amount);
    const rate = new Decimal(gstRate);
    return baseAmount.multiply(rate).divide(100).toDecimalPlaces(2);
  }

  /**
   * Main method: Get complete conversion details for order placement
   * This is the critical method that calculates all pricing and unit conversions
   */
  static async getConversionDetails(
    productId: string,
    orderedQuantity: Decimal | number | string,
    orderedUnitCode: string
  ): Promise<ConversionResult> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        baseUnit: true,
        conversions: {
          include: { toUnit: true },
        },
      },
    });

    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    // Get conversion factors
    const factors = await this.getConversionFactors(productId);

    // Validate that ordered unit is supported
    if (!factors[orderedUnitCode]) {
      throw new Error(
        `Unit '${orderedUnitCode}' is not supported for product '${product.name}'`
      );
    }

    const conversionFactor = factors[orderedUnitCode];
    const orderedQty = new Decimal(orderedQuantity);
    const basePrice = product.basePrice;

    // Calculate base quantity
    const baseQty = this.calculateBaseQuantity(orderedQty, conversionFactor);

    // Calculate unit price for ordered unit
    const unitPrice = this.calculateUnitPrice(basePrice, conversionFactor);

    // Calculate line total (qty × price, rounded to 2 decimals)
    const lineTotal = this.calculateLineTotal(orderedQty, unitPrice);

    // Calculate GST
    const gstRate = product.gstRate || new Decimal(0);
    const gstAmount = this.calculateGST(lineTotal, gstRate);
    const finalTotal = lineTotal.plus(gstAmount);

    return {
      baseUnit: product.baseUnit.code,
      baseQuantity: baseQty,
      orderedUnit: orderedUnitCode,
      orderedQuantity: orderedQty,
      conversionFactor: conversionFactor,
      unitPrice: unitPrice,
      lineTotal: lineTotal,
      gstRate: gstRate,
      gstAmount: gstAmount,
      finalTotal: finalTotal,
    };
  }

  /**
   * Validate conversions in a quotation (for admin/seller review)
   */
  static async validateQuotationConversions(quotationId: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!quotation) {
      throw new Error(`Quotation ${quotationId} not found`);
    }

    const errors: string[] = [];

    for (const item of quotation.items) {
      try {
        // Recalculate what the line total should be
        const expectedLineTotal = new Decimal(item.orderedQuantity)
          .multiply(item.unitPrice)
          .toDecimalPlaces(2);

        // Check if it matches the stored line total
        if (!expectedLineTotal.equals(item.lineTotal)) {
          errors.push(
            `Item ${item.product.name}: Line total mismatch. ` +
            `Expected ₹${expectedLineTotal.toString()}, got ₹${item.lineTotal.toString()}`
          );
        }
      } catch (error) {
        errors.push(`Item ${item.product.name}: Validation error - ${error}`);
      }
    }

    // Validate quotation total
    if (quotation.items.length > 0) {
      const calculatedTotal = quotation.items
        .reduce((sum, item) => sum.plus(item.lineTotal), new Decimal(0))
        .plus(quotation.taxAmount || 0)
        .toDecimalPlaces(2);

      if (!calculatedTotal.equals(quotation.totalAmount)) {
        errors.push(
          `Quotation total mismatch. ` +
          `Expected ₹${calculatedTotal.toString()}, got ₹${quotation.totalAmount.toString()}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if there's sufficient inventory for an order
   */
  static async checkInventory(
    productId: string,
    baseQuantity: Decimal | number
  ): Promise<{ canFulfill: boolean; available: Decimal; required: Decimal }> {
    const inventory = await prisma.inventory.findUnique({
      where: { productId },
    });

    if (!inventory) {
      return {
        canFulfill: false,
        available: new Decimal(0),
        required: new Decimal(baseQuantity),
      };
    }

    const requiredQty = new Decimal(baseQuantity);
    const canFulfill = inventory.quantity.greaterThanOrEqualTo(requiredQty);

    return {
      canFulfill,
      available: inventory.quantity,
      required: requiredQty,
    };
  }

  /**
   * Format currency for display (INR)
   */
  static formatINR(amount: Decimal | number): string {
    const num = new Decimal(amount).toNumber();
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }

  /**
   * Format quantity for display
   */
  static formatQuantity(quantity: Decimal | number, unit: string): string {
    const qty = new Decimal(quantity);
    // Show up to 4 decimal places, removing trailing zeros
    const formatted = qty.toDecimalPlaces(4).toString();
    return `${formatted} ${unit}`;
  }
}

export default UnitConversionService;
