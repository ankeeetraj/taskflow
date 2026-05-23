"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import TaskModal from "@/components/TaskModal";
import InviteModal from "@/components/InviteModal";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import toast from "react-hot-toast";
import { Plus, Users, GripVertical } from "lucide-react";
import { io, Socket } from "socket.io-client";

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-[#FFEAEA] text-[#C0392B]",
  medium: "bg-[#FFF3D6] text-[#D9730D]",
  low: "bg-[#E8F0FF] text-[#6D8196]",
};

function formatDeadline(deadline: string) {
  const d = new Date(deadline);
  return `due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

const inputClass =
  "block w-full px-3 py-2.5 bg-white border border-[#CBCBCB] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#6D8196] text-[#4A4A4A] placeholder:text-[#8A8A8A]/70 text-sm";

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const boardId = unwrappedParams.id;

  const [board, setBoard] = useState<{
    name: string;
    description?: string;
    owner_id: string;
  } | null>(null);
  const [columns, setColumns] = useState<{ id: string; name: string }[]>([]);
  const [tasks, setTasks] = useState<
    {
      id: string;
      column_id: string;
      title: string;
      priority?: string;
      deadline?: string;
      position: number;
    }[]
  >([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<{
    id: string;
    title: string;
    description: string;
    deadline: string;
    priority: string;
    status: string;
  } | null>(null);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [targetColumnId, setTargetColumnId] = useState("");

  const { token } = useAuthStore();
  const router = useRouter();

  const fetchBoardData = async () => {
    try {
      const { data } = await api.get(`/boards/${boardId}`);
      setBoard(data);
      setColumns(data.columns || []);

      let allTasks: typeof tasks = [];
      if (data.columns) {
        data.columns.forEach((col: { tasks?: typeof tasks }) => {
          if (col.tasks) {
            allTasks = [...allTasks, ...col.tasks];
          }
        });
      }
      setTasks(allTasks);
    } catch {
      toast.error("Failed to load board");
      router.push("/dashboard");
    }
  };

  useEffect(() => {
    if (!token) {
      router.push("/");
      return;
    }
    fetchBoardData();

    const socketInstance = io(
      process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
        "http://localhost:5000"
    );
    setSocket(socketInstance);

    socketInstance.emit("joinBoard", boardId);

    socketInstance.on("task:created", (newTask: (typeof tasks)[0]) => {
      setTasks((prev) => [...prev, newTask]);
    });

    socketInstance.on("task:updated", (updatedTask: (typeof tasks)[0]) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
      );
    });

    socketInstance.on(
      "task:deleted",
      (payload: { id: string; column_id: string }) => {
        setTasks((prev) => prev.filter((t) => t.id !== payload.id));
      }
    );

    socketInstance.on("task:moved", (movedTask: (typeof tasks)[0]) => {
      setTasks((prev) => {
        const filtered = prev.filter((t) => t.id !== movedTask.id);
        return [...filtered, movedTask];
      });
    });

    return () => {
      socketInstance.emit("leaveBoard", boardId);
      socketInstance.disconnect();
    };
  }, [token, router, boardId]);

  const onDragEnd = async (result: {
    destination?: { droppableId: string; index: number };
    source: { droppableId: string; index: number };
    draggableId: string;
  }) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const newTasks = Array.from(tasks);
    const draggedTaskIndex = newTasks.findIndex((t) => t.id === draggableId);
    if (draggedTaskIndex === -1) return;

    const draggedTask = { ...newTasks[draggedTaskIndex] };
    const newPosition = destination.index + 1;

    draggedTask.column_id = destination.droppableId;
    newTasks[draggedTaskIndex] = draggedTask;
    setTasks(newTasks);

    try {
      await api.put(`/tasks/${draggableId}/move`, {
        new_column_id: destination.droppableId,
        new_position: newPosition,
      });
      fetchBoardData();
    } catch {
      toast.error("Failed to move task");
      fetchBoardData();
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      await api.post("/tasks", {
        column_id: targetColumnId,
        title: newTaskTitle,
        priority: "medium",
      });
      toast.success("Task created");
      setIsCreateTaskModalOpen(false);
      setNewTaskTitle("");
      fetchBoardData();
    } catch {
      toast.error("Failed to create task");
    }
  };

  const openCreateTaskModal = (columnId: string) => {
    setTargetColumnId(columnId);
    setNewTaskTitle("");
    setIsCreateTaskModalOpen(true);
  };

  const openTaskModal = (task: (typeof tasks)[0] & { description?: string; status?: string }) => {
    setSelectedTask({
      id: task.id,
      title: task.title,
      description: task.description || "",
      deadline: task.deadline || "",
      priority: task.priority || "medium",
      status: task.status || "",
    });
    setIsTaskModalOpen(true);
  };

  if (!board) return null;

  return (
    <section className="flex h-screen bg-[#FFFFE3] overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="p-6 flex justify-between items-start shrink-0">
          <div>
            <h1 className="text-[22px] font-bold text-[#4A4A4A] leading-none">
              {board.name}
            </h1>
            {board.description && (
              <p className="text-[#8A8A8A] text-[13px] mt-2">{board.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 bg-[#FFFFE3] text-[#4A4A4A] px-3 py-1.5 rounded-[8px] hover:bg-[#F5F5D6] border border-[#CBCBCB] font-medium text-sm transition-colors"
          >
            <Users className="w-4 h-4" />
            Members
          </button>
        </header>

        <section className="flex-1 overflow-x-auto px-6 pb-6">
          <DragDropContext onDragEnd={onDragEnd}>
            <ul className="flex gap-6 h-full items-start list-none p-0 m-0">
              {columns.map((column) => {
                const columnTasks = tasks
                  .filter((t) => t.column_id === column.id)
                  .sort((a, b) => a.position - b.position);

                return (
                  <li
                    key={column.id}
                    className="w-80 flex-shrink-0 flex flex-col max-h-full bg-[#F5F5D6] rounded-[10px] border border-[#CBCBCB]"
                  >
                    <header className="px-4 pt-4 pb-2 flex justify-between items-center">
                      <h3 className="font-bold text-[12px] uppercase tracking-[0.08em] text-[#4A4A4A]">
                        {column.name}
                      </h3>
                      <span className="text-[#8A8A8A] text-xs font-medium">
                        {columnTasks.length}
                      </span>
                    </header>

                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <section
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 overflow-y-auto px-3 pb-3 min-h-[150px] transition-colors ${
                            snapshot.isDraggingOver ? "bg-[#FFFFE3]/60" : ""
                          }`}
                        >
                          {columnTasks.map((task, index) => (
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <article
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  onClick={() => openTaskModal(task)}
                                  className={`p-3 rounded-[8px] border border-[#CBCBCB] mb-2 cursor-pointer transition-all flex gap-2 bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] ${
                                    snapshot.isDragging
                                      ? "shadow-md z-50 ring-1 ring-[#CBCBCB]"
                                      : ""
                                  }`}
                                >
                                  <span
                                    {...provided.dragHandleProps}
                                    className="pt-0.5 cursor-grab text-[#CBCBCB] hover:text-[#8A8A8A] transition-colors"
                                  >
                                    <GripVertical className="w-4 h-4" />
                                  </span>
                                  <section className="flex-1 min-w-0">
                                    <h4 className="text-[14px] text-[#4A4A4A] leading-snug break-words">
                                      {task.title}
                                    </h4>

                                    <footer className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                                      {task.priority && (
                                        <span
                                          className={`text-[11px] font-medium px-2 py-0.5 rounded-[4px] uppercase ${
                                            PRIORITY_STYLES[task.priority] ||
                                            PRIORITY_STYLES.medium
                                          }`}
                                        >
                                          {task.priority}
                                        </span>
                                      )}

                                      {task.deadline && (
                                        <time className="text-[11px] text-[#8A8A8A]">
                                          {formatDeadline(task.deadline)}
                                        </time>
                                      )}
                                    </footer>
                                  </section>
                                </article>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}

                          <button
                            type="button"
                            onClick={() => openCreateTaskModal(column.id)}
                            className="mt-1 w-full flex items-center justify-center gap-2 text-[#8A8A8A] p-2 rounded-[8px] border border-dashed border-transparent hover:border-[#CBCBCB] transition-colors text-sm font-medium"
                          >
                            <Plus className="w-4 h-4" />
                            Add task
                          </button>
                        </section>
                      )}
                    </Droppable>
                  </li>
                );
              })}
            </ul>
          </DragDropContext>
        </section>
      </main>

      {isTaskModalOpen && selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setIsTaskModalOpen(false)}
          onUpdate={fetchBoardData}
        />
      )}

      {isCreateTaskModalOpen && (
        <section
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: "rgba(74,74,74,0.4)" }}
        >
          <article className="bg-[#FFFFE3] p-6 rounded-[10px] w-full max-w-md border border-[#CBCBCB] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <h2 className="text-[18px] font-bold text-[#4A4A4A] mb-4">
              Add New Task
            </h2>
            <form onSubmit={handleCreateTask}>
              <input
                type="text"
                placeholder="Task title"
                required
                autoFocus
                className={`${inputClass} mb-6`}
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
              <footer className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateTaskModalOpen(false)}
                  className="px-4 py-2 text-[#8A8A8A] hover:text-[#4A4A4A] transition-colors font-medium text-sm rounded-[8px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4A4A4A] text-[#FFFFE3] rounded-[8px] hover:bg-[#3A3A3A] transition-colors font-medium text-sm"
                >
                  Add Task
                </button>
              </footer>
            </form>
          </article>
        </section>
      )}

      {isInviteModalOpen && (
        <InviteModal
          boardId={boardId}
          boardOwnerId={board.owner_id}
          socket={socket}
          onClose={() => setIsInviteModalOpen(false)}
        />
      )}
    </section>
  );
}
