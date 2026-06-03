import { prisma } from "@/lib/prisma";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    include: {
      buyer: true,
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
          Global Orders
        </h1>
        <p className="text-slate-400 mt-2">Monitor all orders across the platform</p>
      </div>

      <div className="space-y-6">
        {orders.map((order) => (
          <div key={order.id} className="glass-panel p-6 rounded-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Order ID: {order.id}</p>
                <p className="font-medium text-white mt-1">Buyer: {order.buyer.email}</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300">
                  {order.status.toUpperCase()}
                </span>
                <p className="text-xs text-slate-500 mt-2">{new Date(order.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300 mb-4">
                <thead className="text-xs uppercase text-slate-500 border-b border-white/5">
                  <tr>
                    <th className="py-2">Product</th>
                    <th className="py-2 text-right">Base Price</th>
                    <th className="py-2 text-right">Ordered Qty</th>
                    <th className="py-2 text-right">Calculated Unit Price</th>
                    <th className="py-2 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 font-medium text-white">{item.product.name}</td>
                      <td className="py-2 text-right text-slate-400">₹{item.product.basePrice.toString()} / {item.product.baseUnit}</td>
                      <td className="py-2 text-right">{item.orderedQuantity.toString()} {item.orderedUnit}</td>
                      <td className="py-2 text-right text-slate-400">₹{item.unitPrice.toString()} / {item.orderedUnit}</td>
                      <td className="py-2 text-right font-medium text-indigo-300">₹{item.lineTotal.toString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/10">
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase">Total Amount</p>
                <p className="text-xl font-bold text-indigo-400">₹{order.totalAmount.toString()}</p>
              </div>
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <div className="text-center py-12 text-slate-500 glass-panel rounded-2xl">
            No orders found in the system.
          </div>
        )}
      </div>
    </div>
  );
}
