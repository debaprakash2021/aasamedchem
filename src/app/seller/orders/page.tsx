import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { GET } from "@/app/api/auth/[...nextauth]/route";

export default async function SellerOrdersPage() {
  const session = await getServerSession(GET as any);
  const userId = (session?.user as any)?.id;

  const orderItems = await prisma.orderItem.findMany({
    where: {
      product: { sellerId: userId }
    },
    include: {
      order: { include: { buyer: true } },
      product: true
    },
    orderBy: { order: { createdAt: "desc" } }
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-400">
          Sales & Orders
        </h1>
        <p className="text-slate-400 mt-2">View orders placed for your products</p>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="text-xs uppercase bg-slate-900/50 text-slate-400 border-b border-white/5">
            <tr>
              <th className="px-6 py-4 font-medium">Date</th>
              <th className="px-6 py-4 font-medium">Product</th>
              <th className="px-6 py-4 font-medium">Buyer</th>
              <th className="px-6 py-4 font-medium text-right">Quantity Sold</th>
              <th className="px-6 py-4 font-medium text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orderItems.map((item) => (
              <tr key={item.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">{new Date(item.order.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 font-medium text-white">{item.product.name}</td>
                <td className="px-6 py-4">{item.order.buyer.email}</td>
                <td className="px-6 py-4 text-right">
                  {item.orderedQuantity.toString()} <span className="text-slate-500">{item.orderedUnit}</span>
                </td>
                <td className="px-6 py-4 text-right font-bold text-indigo-300">
                  ₹{item.lineTotal.toString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {orderItems.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            No sales yet. Keep adding great products!
          </div>
        )}
      </div>
    </div>
  );
}
