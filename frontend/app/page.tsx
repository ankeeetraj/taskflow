"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import toast from "react-hot-toast";

const inputClass =
  "block w-full px-3 py-2.5 bg-[#FFFFE3] border border-[#CBCBCB] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#6D8196] text-[#4A4A4A] placeholder:text-[#8A8A8A]/70 text-sm";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const { setToken, setUser, token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (token) {
      router.push("/dashboard");
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        const { data } = await api.post("/auth/login", { email, password });
        setToken(data.token);
        setUser(data.user);
        toast.success("Logged in successfully");
        router.push("/dashboard");
      } else {
        const { data } = await api.post("/auth/register", {
          username,
          email,
          password,
        });
        setToken(data.token);
        setUser(data.user);
        toast.success("Registered successfully");
        router.push("/dashboard");
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Authentication failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFFE3] p-4">
      <div className="max-w-md w-full p-8 bg-white rounded-[10px] border border-[#CBCBCB] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="text-center mb-8">
          <h1 className="text-[26px] font-bold text-[#4A4A4A] leading-none mb-2">
            TaskFlow
          </h1>
          <p className="text-[#8A8A8A] text-[14px]">Organize your work.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-[#8A8A8A] mb-1">
                Username
              </label>
              <input
                type="text"
                required
                placeholder="How should we call you?"
                className={inputClass}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-[#8A8A8A] mb-1">
              Email
            </label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#8A8A8A] mb-1">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2.5 px-4 rounded-[8px] text-sm font-semibold text-[#FFFFE3] bg-[#4A4A4A] hover:bg-[#3A3A3A] transition-colors mt-6"
          >
            {isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-[#6D8196] hover:text-[#5a6d80] transition-colors"
          >
            {isLogin
              ? "Don't have an account? Sign up."
              : "Already have an account? Sign in."}
          </button>
        </div>
      </div>
    </div>
  );
}
