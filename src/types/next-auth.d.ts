import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "SELLER" | "BUYER";
      sellerId: string | null;
      status: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "ADMIN" | "SELLER" | "BUYER";
    sellerId: string | null;
    status: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "SELLER" | "BUYER";
    sellerId: string | null;
    status: string;
  }
}
