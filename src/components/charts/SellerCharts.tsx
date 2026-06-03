"use client";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

const COLORS = ["#818cf8", "#34d399", "#fbbf24", "#f87171", "#60a5fa", "#e879f9"];

type ChartData = {
  pieData: { name: string; value: number }[];
  lineData: { date: string; revenue: number }[];
};

export function SellerCharts({ data }: { data: ChartData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
      {/* Revenue by Product (Pie Chart) */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5">
        <h3 className="text-lg font-bold text-white mb-6">Revenue by Product</h3>
        <div className="h-64">
          {data.pieData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">No revenue data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {data.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ color: '#818cf8' }}
                  formatter={(value: any) => [`₹${Number(value || 0).toFixed(2)}`, 'Revenue']}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 30-Day Revenue Trend (Line Chart) */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5">
        <h3 className="text-lg font-bold text-white mb-6">Recent Sales Trend</h3>
        <div className="h-64">
          {data.lineData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">No sales data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                  formatter={(value: any) => [`₹${Number(value || 0).toFixed(2)}`, 'Revenue']}
                />
                <Line type="monotone" dataKey="revenue" stroke="#818cf8" strokeWidth={3} dot={{ fill: '#818cf8', r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
