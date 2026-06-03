"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
};

export function UserTable({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  const toggleStatus = async (id: string, currentStatus: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/toggle-status`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(users.map(u => u.id === id ? { ...u, status: data.status } : u));
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="text-xs uppercase bg-slate-900/50 text-slate-400 border-b border-white/5">
          <tr>
            <th className="px-6 py-4 font-medium">Name</th>
            <th className="px-6 py-4 font-medium">Email</th>
            <th className="px-6 py-4 font-medium">Role</th>
            <th className="px-6 py-4 font-medium">Status</th>
            <th className="px-6 py-4 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {users.map((user) => (
            <tr key={user.id} className={`hover:bg-white/5 transition-colors ${user.status === 'SUSPENDED' ? 'opacity-50' : ''}`}>
              <td className="px-6 py-4 font-medium text-white">{user.name || "-"}</td>
              <td className="px-6 py-4">{user.email}</td>
              <td className="px-6 py-4">
                <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                  user.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/20' :
                  user.role === 'SELLER' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/20' :
                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20'
                }`}>
                  {user.role}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                  user.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'
                }`}>
                  {user.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                {user.role !== 'ADMIN' && (
                  <button 
                    onClick={() => toggleStatus(user.id, user.status)}
                    disabled={loadingId === user.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      user.status === 'ACTIVE' 
                        ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' 
                        : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                    }`}
                  >
                    {loadingId === user.id ? '...' : (user.status === 'ACTIVE' ? 'Suspend' : 'Activate')}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
