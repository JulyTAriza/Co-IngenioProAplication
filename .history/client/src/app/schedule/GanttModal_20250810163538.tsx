// components/cronograma/GanttModal.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { ViewMode } from "gantt-task-react";
import { Project, TaskExtended, TaskStatus } from "./types";
import {
  formatDateShort,
  startOfDay,
  genId,
  inputToDate,
  dateToInputValue,
} from "./helpers";
import TaskList from "./TaskList";
import TaskForm from "./TaskForm";
import GanttChart from "./GanttChart";

type Props = {
  project: Project;
  onClose: () => void;
  onSave: (project: Project) => void;
};

export default function GanttModal({ project, onClose, onSave }: Props) {
  const [tasks, setTasks] = useState<TaskExtended[]>(
    () => project.tasks?.map((t) => ({ ...t })) ?? []
  );
  const [view, setView] = useState<ViewMode>(ViewMode.Month);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<TaskExtended, "id">>({
    name: "",
    start: new Date(),
    end: new Date(new Date().setDate(new Date().getDate() + 3)),
    type: "task",
    progress: 0,
    isDisabled: false,
    dependencies: [],
    responsible: "Sin asignar",
    status: "Pendiente",
    description: "",
    materialPercent: 0,
    grupo: "Fase 1", // valor por defecto
  });

  const users = useMemo(
    () =>
      Array.from(
        new Set<string>([
          "Sin asignar",
          ...tasks.map((t) => t.responsible ?? "Sin asignar"),
        ])
      ),
    [tasks]
  );

  const delayed = useMemo(() => {
    const now = new Date();
    return tasks.filter(
      (t) => t.status !== "Completada" && new Date(t.end) < startOfDay(now)
    );
  }, [tasks]);

  useEffect(() => {
    const now = startOfDay(new Date());
    setTasks((prev) =>
      prev.map((t) => {
        if (t.status === "Completada") return t;
        if (new Date(t.end) < now)
          return { ...t, status: "Atrasada" as TaskStatus };
        return t;
      })
    );
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      name: "",
      start: new Date(),
      end: new Date(new Date().setDate(new Date().getDate() + 3)),
      type: "task",
      progress: 0,
      isDisabled: false,
      dependencies: [],
      responsible: "Sin asignar",
      status: "Pendiente",
      description: "",
      materialPercent: 0,
      grupo: "Fase 1",
    });
    setIsFormOpen(true);
  };

  const openEdit = (id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    setEditingId(id);
    const copy = { ...t };
    // @ts-ignore
    delete copy.id;
    setForm(copy);
    setIsFormOpen(true);
  };

  const saveForm = () => {
    if (!form.name.trim()) {
      alert("El nombre es obligatorio.");
      return;
    }
    if (form.end < form.start) {
      alert("La fecha fin no puede ser anterior a la fecha inicio.");
      return;
    }

    if (editingId) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? {
                ...t,
                ...form,
                start: new Date(form.start),
                end: new Date(form.end),
              }
            : t
        )
      );
    } else {
      const newTask: TaskExtended = {
        id: genId(),
        ...form,
        start: new Date(form.start),
        end: new Date(form.end),
      };
      setTasks((prev) => [...prev, newTask]);
    }
    setIsFormOpen(false);
  };

  const removeTask = (id: string) => {
    if (!confirm("¿Eliminar tarea?")) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleComplete = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: t.status === "Completada" ? "En Progreso" : "Completada",
              progress: t.status === "Completada" ? t.progress : 100,
            }
          : t
      )
    );
  };

  const onDateChange = (changed: any) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === changed.id
          ? {
              ...t,
              start: new Date(changed.start),
              end: new Date(changed.end),
            }
          : t
      )
    );
  };

  const onProgressChange = (changed: any) => {
    const newProgress = Number(changed.progress ?? 0);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === changed.id
          ? {
              ...t,
              progress: newProgress,
              status: newProgress >= 100 ? "Completada" : t.status,
            }
          : t
      )
    );
  };

  const saveProjectAndClose = () => {
    const updated: Project = { ...project, tasks };
    onSave(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white w-full max-w-7xl rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold">
              Cronograma — {project.name}
            </h3>
            <p className="text-sm text-gray-500">
              {project.start.toLocaleDateString()} →{" "}
              {project.end.toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-600">
              {delayed.length > 0 ? `⚠ ${delayed.length} atrasada(s)` : ""}
            </span>
            <button className="px-3 py-1 rounded border" onClick={onClose}>
              Cerrar
            </button>
            <button
              className="px-3 py-1 rounded bg-blue-600 text-white"
              onClick={saveProjectAndClose}
            >
              Guardar
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <TaskList
            tasks={tasks}
            onEdit={openEdit}
            onDelete={removeTask}
            onToggleComplete={toggleComplete}
            openCreate={openCreate}
            setViewMode={(v) =>
              setView(ViewMode[v as keyof typeof ViewMode])
            }
            viewMode={view.toString()}
          />

          <div className="lg:col-span-2 bg-white rounded p-3 overflow-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Vista: {view}</div>
              <div className="text-sm text-gray-600">
                Usuarios: {users.length}
              </div>
            </div>

            <GanttChart
              tasks={tasks}
              view={view}
              onDateChange={onDateChange}
              onProgressChange={onProgressChange}
            />
          </div>
        </div>

        {/* Form modal */}
        {isFormOpen && (
          <TaskForm
            editingId={editingId}
            form={form}
            tasks={tasks.filter((t) => t.id !== editingId)}
            onChange={(patch) => setForm((p) => ({ ...p, ...patch }))}
            onCancel={() => setIsFormOpen(false)}
            onSave={saveForm}
          />
        )}
      </div>
    </div>
  );
}
