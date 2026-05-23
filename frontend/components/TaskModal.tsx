"use client";

import { useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { X } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string;
  priority: string;
  status: string;
}

interface TaskModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: () => void;
}

const fieldClass =
  "block w-full px-3 py-2.5 bg-white border border-[#CBCBCB] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#6D8196] text-[#4A4A4A] placeholder:text-[#8A8A8A]/70 text-sm";

export default function TaskModal({ task, onClose, onUpdate }: TaskModalProps) {
  const [title, setTitle] = useState(task.title || "");
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState(task.priority || "medium");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await api.put(`/tasks/${task.id}`, { title, description, priority });
      toast.success("Task updated");
      onUpdate();
      onClose();
    } catch {
      toast.error("Failed to update task");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      toast.success("Task deleted");
      onUpdate();
      onClose();
    } catch {
      toast.error("Failed to delete task");
    }
  };

  return (
    <section
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: "rgba(74,74,74,0.4)" }}
    >
      <article className="bg-[#FFFFE3] p-6 rounded-[10px] w-full max-w-md border border-[#CBCBCB] shadow-[0_2px_8px_rgba(0,0,0,0.06)] relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-[#CBCBCB] hover:text-[#8A8A8A] transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <form onSubmit={handleUpdate} className="space-y-4">
          <input
            type="text"
            required
            className="w-full text-[18px] font-bold text-[#4A4A4A] bg-transparent border-none focus:outline-none focus:ring-0 p-0 pr-8"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
          />

          <div>
            <label className="block text-sm font-medium text-[#8A8A8A] mb-1">
              Description
            </label>
            <textarea
              className={fieldClass}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <fieldset className="border-0 p-0 m-0">
            <label className="block text-sm font-medium text-[#8A8A8A] mb-1">
              Priority
            </label>
            <select
              className={fieldClass}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </fieldset>

          <footer className="flex justify-between items-center mt-8 pt-6 border-t border-[#CBCBCB]">
            <button
              type="button"
              onClick={handleDelete}
              className="text-[#8A8A8A] hover:text-[#4A4A4A] transition-colors text-sm font-medium"
            >
              Delete Task
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="px-4 py-2 bg-[#4A4A4A] text-[#FFFFE3] rounded-[8px] hover:bg-[#3A3A3A] transition-colors font-medium text-sm disabled:opacity-50"
            >
              Save
            </button>
          </footer>
        </form>
      </article>
    </section>
  );
}
