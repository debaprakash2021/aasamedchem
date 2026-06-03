import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { name, email, password, role, businessName } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (role === "SELLER" && !businessName) {
      return NextResponse.json({ error: "Business name is required for sellers" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role
      }
    });

    if (role === "SELLER") {
      const sellerProfile = await prisma.sellerProfile.create({
        data: {
          userId: user.id,
          businessName
        }
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { sellerId: sellerProfile.id }
      });
    }

    return NextResponse.json({ message: "User registered successfully", userId: user.id });

  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
