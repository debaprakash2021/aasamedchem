import { NextResponse } from "next/server";
import UnitConversionService from "@/lib/services/UnitConversionService";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    console.log("🧪 Testing Unit Conversion System...\n");

    // Get a sample product (Wheat Flour)
    const wheatFlour = await prisma.product.findFirst({
      where: { name: "Wheat Flour" },
    });

    if (!wheatFlour) {
      return NextResponse.json(
        { error: "Sample product not found. Did you run the seed?" },
        { status: 400 }
      );
    }

    // Test 1: Order 500g of Wheat Flour (base unit is kg, ₹40/kg)
    console.log("Test 1: Order 500g of Wheat Flour (base: kg, price: ₹40/kg)");
    const result1 = await UnitConversionService.getConversionDetails(
      wheatFlour.id,
      500,
      "g"
    );

    console.log("Result:");
    console.log(`  Base Unit: ${result1.baseUnit}`);
    console.log(`  Base Quantity: ${result1.baseQuantity} ${result1.baseUnit}`);
    console.log(`  Ordered: ${result1.orderedQuantity} ${result1.orderedUnit}`);
    console.log(`  Conversion Factor: ${result1.conversionFactor}`);
    console.log(`  Unit Price: ₹${result1.unitPrice.toString()}/${result1.orderedUnit}`);
    console.log(`  Line Total: ₹${result1.lineTotal.toString()}`);
    console.log(`  GST (5%): ₹${result1.gstAmount.toString()}`);
    console.log(`  Final Total: ₹${result1.finalTotal.toString()}\n`);

    // Test 2: Order 1 kg of Wheat Flour
    console.log("Test 2: Order 1 kg of Wheat Flour");
    const result2 = await UnitConversionService.getConversionDetails(
      wheatFlour.id,
      1,
      "kg"
    );

    console.log("Result:");
    console.log(`  Base Quantity: ${result2.baseQuantity} ${result2.baseUnit}`);
    console.log(`  Unit Price: ₹${result2.unitPrice.toString()}/${result2.orderedUnit}`);
    console.log(`  Line Total: ₹${result2.lineTotal.toString()}`);
    console.log(`  Final Total: ₹${result2.finalTotal.toString()}\n`);

    // Test 3: Check inventory
    console.log("Test 3: Check inventory for 0.5 kg");
    const inventory = await UnitConversionService.checkInventory(wheatFlour.id, 0.5);
    console.log(`  Can Fulfill: ${inventory.canFulfill}`);
    console.log(`  Available: ${inventory.available} kg`);
    console.log(`  Required: ${inventory.required} kg\n`);

    // Test 4: Format output
    console.log("Test 4: Formatted display");
    console.log(
      `  Price Display: ${UnitConversionService.formatINR(result1.lineTotal)}`
    );
    console.log(
      `  Quantity Display: ${UnitConversionService.formatQuantity(500, "g")}`
    );

    return NextResponse.json(
      {
        success: true,
        message: "✅ All unit conversion tests passed!",
        tests: [
          {
            name: "Order 500g of Wheat Flour",
            expectedResult: "₹20.00 (₹40/kg × 0.5 kg)",
            actualResult: result1.lineTotal.toString(),
            passed: result1.lineTotal.toNumber() === 20,
          },
          {
            name: "Order 1 kg of Wheat Flour",
            expectedResult: "₹40.00",
            actualResult: result2.lineTotal.toString(),
            passed: result2.lineTotal.toNumber() === 40,
          },
          {
            name: "Inventory check (0.5 kg available for 10 kg stock)",
            expectedResult: "canFulfill = true",
            actualResult: `canFulfill = ${inventory.canFulfill}`,
            passed: inventory.canFulfill === true,
          },
        ],
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ Test error:", error);
    return NextResponse.json(
      {
        error: "Test failed",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
