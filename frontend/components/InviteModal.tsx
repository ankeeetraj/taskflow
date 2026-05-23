"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { X, UserPlus } from "lucide-react";
import { Socket } from "socket.io-client";
import { useAuthStore } from "@/store/authStore";

interface InviteModalProps {
  boardId: string;
  boardOwnerId: string;
  socket: Socket | null;
  onClose: () => void;
}

const inputClass =
  "flex-1 px-3 py-2.5 bg-white border border-[#CBCBCB] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#6D8196] text-[#4A4A4A] placeholder:text-[#8A8A8A]/70 text-sm";

export default function InviteModal({
  boardId,
  boardOwnerId,
  socket,
  onClose,
}: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [members, setMembers] = useState<
    { id: string; username: string; email: string; role: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthStore();

  const fetchMembers = async () => {
    try {
      const { data } = await api.get(`/boards/${boardId}/members`);
      setMembers(data);
    } catch {
      toast.error("Failed to load members");
    }
  };

  useEffect(() => {
    fetchMembers();

    if (socket) {
      socket.on("member:invited", fetchMembers);
      socket.on("member:removed", fetchMembers);
    }

    return () => {
      if (socket) {
        socket.off("member:invited", fetchMembers);
        socket.off("member:removed", fetchMembers);
      }
    };
  }, [boardId, socket]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      await api.post(`/boards/${boardId}/members`, { email });
      toast.success("Member invited successfully");
      setEmail("");
      fetchMembers();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to invite member");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      await api.delete(`/boards/${boardId}/members/${userId}`);
      toast.success("Member removed");
      fetchMembers();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to remove member");
    }
  };

  const isOwner = user?.id === boardOwnerId;

  return (
    <section
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: "rgba(74,74,74,0.4)" }}
    >
      <article className="bg-[#FFFFE3] p-6 rounded-[10px] w-full max-w-lg border border-[#CBCBCB] shadow-[0_2px_8px_rgba(0,0,0,0.06)] relative max-h-[85vh] flex flex-col">
        <header className="flex justify-between items-center mb-6 pr-8">
          <h2 className="text-[18px] font-bold text-[#4A4A4A]">Board Members</h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 text-[#CBCBCB] hover:text-[#8A8A8A] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <section className="overflow-y-auto flex-1 pr-1">
          <form onSubmit={handleInvite} className="mb-8 flex gap-3">
            <input
              type="email"
              required
              placeholder="Enter email address to invite"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="bg-[#4A4A4A] text-[#FFFFE3] px-4 py-2 rounded-[8px] hover:bg-[#3A3A3A] disabled:opacity-50 flex items-center gap-2 font-medium text-sm transition-colors shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              Invite
            </button>
          </form>

          <h3 className="text-[12px] font-bold text-[#4A4A4A] uppercase tracking-[0.08em] mb-4">
            Current Members
          </h3>
          <ul className="space-y-2 list-none p-0 m-0">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between p-3 rounded-[8px] bg-white border border-[#CBCBCB]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-full bg-[#6D8196] flex items-center justify-center text-[#FFFFE3] font-medium text-sm shrink-0">
                    {member.username.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-[#4A4A4A] flex items-center gap-2 text-[14px] leading-none flex-wrap">
                      {member.username}
                      {member.role === "admin" && (
                        <span className="bg-[#6D8196] text-[#FFFFE3] text-[10px] font-medium px-2 py-0.5 rounded-[4px]">
                          OWNER
                        </span>
                      )}
                    </p>
                    <p className="text-[12px] text-[#8A8A8A] mt-1 truncate">
                      {member.email}
                    </p>
                  </div>
                </div>
                {isOwner && member.role !== "admin" && (
                  <button
                    type="button"
                    onClick={() => handleRemove(member.id)}
                    className="text-[#8A8A8A] hover:text-[#4A4A4A] text-sm font-medium shrink-0 ml-2"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      </article>
    </section>
  );
}
