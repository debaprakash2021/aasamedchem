import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { GET } from "@/app/api/auth/[...nextauth]/route";

export default async function BuyerOrdersPage() {
  const session = await getServerSession(GET as any);
  const userId = (session?.user as any)?.id;

  const orders = await prisma.order.findMany({
    where: { buyerId: userId },
    include: {
      items: {
        include: { product: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-400">
          My Orders
        </h1>
        <p className="text-slate-400 mt-2">Track your past orders</p>
      </div>

      <div className="space-y-6">
        {orders.map((order) => (
          <div key={order.id} className="glass-panel p-6 rounded-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Order ID</p>
                <p className="font-mono text-sm text-slate-300">{order.id}</p>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  order.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-300' :
                  order.status === 'pending' ? 'bg-amber-500/20 text-amber-300' :
                  'bg-slate-500/20 text-slate-300'
                }`}>
                  {order.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-white/5 p-4 rounded-lg">
                  <div>
                    <p className="font-semibold text-white">{item.product.name}</p>
                    <p className="text-sm text-slate-400">
                      {item.orderedQuantity.toString()} {item.orderedUnit} @ ₹{item.unitPrice.toString()} / {item.orderedUnit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-indigo-300">₹{item.lineTotal.toString()}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
              <span className="text-slate-400">Placed on {new Date(order.createdAt).toLocaleDateString()}</span>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase">Total Amount</p>
                <p className="text-xl font-bold text-indigo-400">₹{order.totalAmount.toString()}</p>
              </div>
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <div className="text-center py-12 text-slate-500 glass-panel rounded-2xl">
            You haven't placed any orders yet.
          </div>
        )}
      </div>
    </div>
  );
}
