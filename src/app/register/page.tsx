"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

function RegisterForm() {
  const searchParams = useSearchParams();
  const initRole = searchParams.get("role") === "SELLER" ? "SELLER" : "BUYER";
  
  const [role, setRole] = useState(initRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, businessName })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      // Auto-login after registration
      const loginRes = await signIn("credentials", {
        email, password, redirect: false
      });

      if (loginRes?.error) {
        router.push("/login");
      } else {
        router.push(role === "SELLER" ? "/seller" : "/browse");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl relative overflow-hidden">
        <div className="absolute top-[-50px] left-[-50px] w-32 h-32 bg-emerald-500/20 rounded-full blur-[40px] pointer-events-none" />
        
        <div className="relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">
              Create Account
            </h1>
            <p className="text-slate-400 mt-2 text-sm">Join AasaMedChem as a {role.toLowerCase()}</p>
          </div>

          <div className="flex bg-slate-900/50 p-1 rounded-lg mb-6 border border-white/5">
            <button
              type="button"
              onClick={() => setRole("BUYER")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${role === "BUYER" ? "bg-white/10 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
            >
              Buyer
            </button>
            <button
              type="button"
              onClick={() => setRole("SELLER")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${role === "SELLER" ? "bg-white/10 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
            >
              Seller
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input type="text" required className="w-full px-3 py-2 rounded-lg glass-input text-sm" value={name} onChange={e => setName(e.target.value)} />
            </div>
            
            {role === "SELLER" && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Business Name</label>
                <input type="text" required className="w-full px-3 py-2 rounded-lg glass-input text-sm" value={businessName} onChange={e => setBusinessName(e.target.value)} />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <input type="email" required className="w-full px-3 py-2 rounded-lg glass-input text-sm" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <input type="password" required minLength={6} className="w-full px-3 py-2 rounded-lg glass-input text-sm" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 mt-6"
            >
              {isLoading ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-emerald-400 hover:underline">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-emerald-500">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
