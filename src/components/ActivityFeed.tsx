"use client";

type AuditLog = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  createdAt: string | Date;
  user: { email: string; role: string };
};

export function ActivityFeed({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) {
    return <div className="text-center p-12 text-slate-500 glass-panel rounded-2xl">No activity recorded yet.</div>;
  }

  const getBadgeColor = (action: string) => {
    if (action.includes("CREATE")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (action.includes("UPDATE") || action.includes("APPROVE") || action.includes("PAY")) return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (action.includes("DELETE") || action.includes("REJECT") || action.includes("CANCEL")) return "bg-red-500/10 text-red-400 border-red-500/20";
    if (action.includes("SUBMIT")) return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  };

  return (
    <div className="relative border-l border-white/10 ml-4 space-y-8 pb-12">
      {logs.map((log) => {
        const timeStr = new Date(log.createdAt).toLocaleString("en-IN", {
          month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
        });
        
        return (
          <div key={log.id} className="relative pl-6">
            <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-slate-950" />
            
            <div className="glass-panel p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded border font-mono ${getBadgeColor(log.action)}`}>
                    {log.action}
                  </span>
                  <span className="text-sm font-bold text-slate-300">{log.resourceType}</span>
                  <span className="text-xs font-mono text-slate-500">#{log.resourceId.slice(-8)}</span>
                </div>
                <span className="text-xs text-slate-500 whitespace-nowrap">{timeStr}</span>
              </div>
              
              <div className="text-sm text-slate-400 mt-2 sm:mt-0">
                Action performed by <span className="text-indigo-400 font-medium">{log.user.email}</span> 
                <span className="ml-2 text-[10px] uppercase tracking-wider bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-slate-500">
                  {log.user.role}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
