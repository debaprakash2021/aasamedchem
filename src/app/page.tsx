import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  
  if (!session) redirect("/login");
  
  const role = (session.user as any)?.role;
  
  if (role === "ADMIN") redirect("/admin");
  if (role === "SELLER") redirect("/seller");
  if (role === "BUYER") redirect("/buyer/browse");
  
  redirect("/login");
}
