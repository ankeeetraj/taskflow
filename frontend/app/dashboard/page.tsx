"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";

const BORDER_COLORS = ["#F5A623", "#E8635A", "#6D8196", "#4CAF7D"];

type BoardWithCount = {
  id: string;
  name: string;
  description?: string;
  taskCount: number;
};

const inputClass =
  "block w-full px-3 py-2.5 bg-[#FFFFE3] border border-[#CBCBCB] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#6D8196] text-[#4A4A4A] placeholder:text-[#8A8A8A]/70 text-sm";

export default function DashboardPage() {
  const [boards, setBoards] = useState<BoardWithCount[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDesc, setNewBoardDesc] = useState("");

  const { token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      router.push("/");
      return;
    }
    fetchBoards();
  }, [token, router]);

  const fetchBoards = async () => {
    try {
      const { data } = await api.get("/boards");
      const withCounts = await Promise.all(
        data.map(async (board: { id: string; name: string; description?: string }) => {
          try {
            const { data: full } = await api.get(`/boards/${board.id}`);
            const taskCount =
              full.columns?.reduce(
                (acc: number, col: { tasks?: unknown[] }) =>
                  acc + (col.tasks?.length ?? 0),
                0
              ) ?? 0;
            return { ...board, taskCount };
          } catch {
            return { ...board, taskCount: 0 };
          }
        })
      );
      setBoards(withCounts);
    } catch (error) {
      console.error("Error fetching boards", error);
    }
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/boards", {
        name: newBoardName,
        description: newBoardDesc,
      });
      toast.success("Board created successfully");
      setIsModalOpen(false);
      setNewBoardName("");
      setNewBoardDesc("");
      fetchBoards();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to create board");
    }
  };

  if (!token) return null;

  return (
    <div className="flex min-h-screen bg-[#FFFFE3]">
      <Sidebar />

      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-[24px] font-bold text-[#4A4A4A] leading-none">
            Dashboard
          </h1>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#4A4A4A] text-[#FFFFE3] px-4 py-2 rounded-[8px] hover:bg-[#3A3A3A] transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            New Board
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {boards.map((board, index) => {
            const topColor = BORDER_COLORS[index % BORDER_COLORS.length];
            return (
              <Link key={board.id} href={`/board/${board.id}`}>
                <article
                  className="bg-white p-5 rounded-[10px] border border-[#CBCBCB] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all cursor-pointer h-full flex flex-col"
                  style={{ borderTop: `3px solid ${topColor}` }}
                >
                  <h3 className="text-[16px] font-bold text-[#4A4A4A] mb-1 leading-tight">
                    {board.name}
                  </h3>
                  <p className="text-[#8A8A8A] text-[13px] line-clamp-3 mb-4 flex-1">
                    {board.description || "No description"}
                  </p>
                  <span className="inline-flex self-start text-[12px] text-[#8A8A8A] bg-[#FFFFE3] border border-[#CBCBCB] px-2 py-0.5 rounded-[4px]">
                    {board.taskCount} {board.taskCount === 1 ? "task" : "tasks"}
                  </span>
                </article>
              </Link>
            );
          })}
        </div>

        {boards.length === 0 && (
          <div className="text-center py-24 flex flex-col items-center justify-center">
            <h3 className="font-bold text-[18px] text-[#8A8A8A] mb-2">
              No boards yet.
            </h3>
            <p className="text-[#8A8A8A] text-sm">
              Create your first board to get started.
            </p>
          </div>
        )}
      </main>

      {isModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: "rgba(74,74,74,0.4)" }}
        >
          <div className="bg-[#FFFFE3] p-6 rounded-[10px] w-full max-w-md border border-[#CBCBCB] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <h2 className="text-[18px] font-bold text-[#4A4A4A] mb-4">
              Create New Board
            </h2>
            <form onSubmit={handleCreateBoard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#8A8A8A] mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Plan"
                  className={inputClass}
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8A8A8A] mb-1">
                  Description
                </label>
                <textarea
                  className={inputClass}
                  placeholder="What's this board for?"
                  rows={3}
                  value={newBoardDesc}
                  onChange={(e) => setNewBoardDesc(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-[#8A8A8A] hover:text-[#4A4A4A] transition-colors font-medium text-sm rounded-[8px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4A4A4A] text-[#FFFFE3] rounded-[8px] hover:bg-[#3A3A3A] transition-colors font-medium text-sm"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
