import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { GET } from "@/app/api/auth/[...nextauth]/route";

export default async function Home() {
  const session = await getServerSession(GET as any);

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any)?.role;

  if (role === "admin") redirect("/admin");
  if (role === "seller") redirect("/seller");
  if (role === "buyer") redirect("/buyer/browse");

  return null;
}
