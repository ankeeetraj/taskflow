"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { LayoutDashboard, LogOut, Grid } from "lucide-react";

export default function Sidebar() {
  const [boards, setBoards] = useState<any[]>([]);
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const fetchBoards = async () => {
    try {
      const { data } = await api.get("/boards");
      setBoards(data);
    } catch (error) {
      console.error("Error fetching boards", error);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const navLinkClass = (active: boolean) =>
    `flex items-center gap-2 px-3 py-2 rounded-[6px] text-[14px] transition-colors ${
      active
        ? "bg-[#5A5A5A] text-[#FFFFE3]"
        : "text-[#CBCBCB] hover:bg-[#5A5A5A] hover:text-[#FFFFE3]"
    }`;

  return (
    <aside className="w-64 bg-[#4A4A4A] text-[#CBCBCB] min-h-screen p-4 flex flex-col shrink-0">
      <div className="flex items-center gap-2 mb-8 px-2 mt-2">
        <Grid className="w-4 h-4 text-[#FFFFE3] shrink-0" />
        <span className="text-[18px] font-bold leading-none text-[#FFFFE3]">
          TaskFlow
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Link href="/dashboard" className={navLinkClass(pathname === "/dashboard")}>
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          Dashboard
        </Link>

        <div className="mt-6 mb-2 px-3 text-[11px] font-semibold text-[#CBCBCB] uppercase tracking-wider opacity-80">
          Your Boards
        </div>
        <div className="space-y-0.5">
          {boards.map((board) => {
            const isActive = pathname === `/board/${board.id}`;
            return (
              <Link
                key={board.id}
                href={`/board/${board.id}`}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-[14px] transition-colors truncate ${
                  isActive
                    ? "text-[#FFFFE3]"
                    : "text-[#CBCBCB] hover:bg-[#5A5A5A] hover:text-[#FFFFE3]"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isActive ? "bg-[#FFFFE3]" : "bg-[#CBCBCB]"
                  }`}
                />
                <span className="truncate">{board.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-[#5A5A5A]">
        <p className="px-3 mb-2 text-[12px] text-[#CBCBCB] truncate">
          Logged in as {user?.username}
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-[6px] text-[14px] text-[#CBCBCB] hover:text-[#FFFFE3] transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  );
}
