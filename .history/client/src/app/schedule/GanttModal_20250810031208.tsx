// GanttModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { Project, TaskExtended, TaskStatus } from "./types";

/**
 * Modal que contiene el Gantt y la UI para agregar/editar tareas.
 * Props:
 *  - project: Project (se trabaja sobre copia local)
 *  - onClose: () => void
 *  - onSave: (project: Project) => void
 */

type Props = {
  project: Project;
  onClose: () => void;
  onSave: (project: Project) => void;
};

const genId = (prefix = "t") => prefix + Math.random().toString(36).slice(2, 9);

export default function GanttModal({ project, onClose, onSave }: Props) {
  const [tasks, setTasks] = useState<TaskExtended[]>(() =>
    project.tasks ? project.tasks.map((t) => ({ ...t })) : []
  );
  const [view, setView] = useState<ViewMode>(ViewMode.Week);

  // modal de formulario para crear/editar tarea
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
  });

  // lista de usuarios (derivada)
  const users = useMemo(
    () =>
      Array.from(
        new Set<string>([
          "Sin asignar",
          ...tasks.map((t) => (t.responsible ? t.responsible : "Sin asignar")),
        ])
      ),
    [tasks]
  );

  // detectar tareas atrasadas para alerta
  const delayed = useMemo(() => {
    const now = new Date();
    return tasks.filter((t) => t.status !== "Completada" && new Date(t.end) < startOfDay(now));
  }, [tasks]);

  // util helpers fechas
  function dateToInputValue(d: Date) {
    return d.toISOString().split("T")[0];
  }
  function inputToDate(v: string) {
    return new Date(v + "T00:00:00");
  }
  function startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // abrir form para crear
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
    });
    setIsFormOpen(true);
  };

  // abrir form para editar
  const openEdit = (id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    setEditingId(id);
    const copy = { ...t };
    // remove id
    // @ts-ignore
    delete copy.id;
    setForm(copy);
    setIsFormOpen(true);
  };

  // salvar form (create/update)
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
                name: form.name,
                start: new Date(form.start),
                end: new Date(form.end),
                progress: Number(form.progress),
                dependencies: form.dependencies ?? [],
                responsible: form.responsible,
                status: form.status ?? t.status,
                description: form.description,
              }
            : t
        )
      );
    } else {
      const newTask: TaskExtended = {
        id: genId(),
        name: form.name,
        start: new Date(form.start),
        end: new Date(form.end),
        type: form.type ?? "task",
        progress: Number(form.progress),
        isDisabled: false,
        dependencies: form.dependencies ?? [],
        responsible: form.responsible ?? "Sin asignar",
        status: (form.status as TaskStatus) ?? "Pendiente",
        description: form.description,
      };
      setTasks((prev) => [...prev, newTask]);
    }
    setIsFormOpen(false);
  };

  const removeTask = (id: string) => {
    if (!confirm("¿Eliminar tarea?")) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // toggle completado rápido
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

  // handlers Gantt
  const onDateChange = (changed: any) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === changed.id ? { ...t, start: new Date(changed.start), end: new Date(changed.end) } : t))
    );
  };

  const onProgressChange = (changed: any) => {
    const newProgress = Number(changed.progress ?? 0);
    setTasks((prev) =>
      prev.map((t) => (t.id === changed.id ? { ...t, progress: newProgress, status: newProgress >= 100 ? "Completada" : t.status } : t))
    );
  };

  // guardar proyecto y cerrar modal
  const saveProjectAndClose = () => {
    const updated: Project = { ...project, tasks };
    onSave(updated);
  };

  useEffect(() => {
    // recalcular automaticamente estados atrasados al montarse (demo)
    const now = startOfDay(new Date());
    setTasks((prev) =>
      prev.map((t) => {
        if (t.status === "Completada") return t;
        if (new Date(t.end) < now) return { ...t, status: "Atrasada" as TaskStatus };
        return t;
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // convertir a Task[] para gantt
  const ganttTasks: Task[] = tasks.map((t) => ({
    id: t.id,
    name: t.name,
    start: new Date(t.start),
    end: new Date(t.end),
    type: t.type ?? "task",
    progress: t.progress,
    isDisabled: false,
    dependencies: t.dependencies ?? [],
    styles: { progressColor: colorForStatus(t.status) },
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white w-full max-w-6xl rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold">Cronograma — {project.name}</h3>
            <p className="text-sm text-gray-500">
              {project.start.toLocaleDateString()} → {project.end.toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-600">{delayed.length > 0 ? `⚠ ${delayed.length} atrasada(s)` : ""}</span>
            <button className="px-3 py-1 rounded border" onClick={onClose}>
              Cerrar
            </button>
            <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={saveProjectAndClose}>
              Guardar
            </button>
          </div>
        </div>

        {/* Controls + content */}
        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* left: lista de tareas y controles */}
          <div className="lg:col-span-1 bg-gray-50 rounded p-3 space-y-3">
            <div className="flex items-center justify-between">
              <strong>Tareas</strong>
              <div className="flex gap-2">
                <button className="px-2 py-1 rounded bg-green-600 text-white" onClick={openCreate}>+ Nueva</button>
                <select className="border rounded px-2 py-1" value={view} onChange={(e) => setView(e.target.value as ViewMode)}>
                  <option value={ViewMode.Day}>Día</option>
                  <option value={ViewMode.Week}>Semana</option>
                  <option value={ViewMode.Month}>Mes</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-auto pr-2">
              {tasks.length === 0 && <div className="text-sm text-gray-500">No hay tareas.</div>}
              {tasks.map((t) => (
                <div key={t.id} className="bg-white border rounded p-2">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="font-semibold text-sm">{t.name}</div>
                      <div className="text-xs text-gray-500">{formatDateShort(t.start)} → {formatDateShort(t.end)}</div>
                      <div className="text-xs text-gray-600">Responsable: {t.responsible}</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button className="text-xs px-2 py-1 border rounded" onClick={() => openEdit(t.id)}>Editar</button>
                      <button className="text-xs px-2 py-1 border rounded" onClick={() => toggleComplete(t.id)}>{t.status === "Completada" ? "Desmarcar" : "Completar"}</button>
                      <button className="text-xs px-2 py-1 border rounded text-red-600" onClick={() => removeTask(t.id)}>Eliminar</button>
                    </div>
                  </div>
                  <div className="mt-2 text-xs">
                    Estado: <strong>{t.status}</strong> • Progreso: <strong>{t.progress}%</strong>
                    {t.dependencies && t.dependencies.length > 0 && (
                      <div className="text-xs text-gray-600">Depende de: {t.dependencies.map((id) => tasks.find(x => x.id === id)?.name ?? id).join(", ")}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* right: gantt (col-span-2) */}
          <div className="lg:col-span-2 bg-white rounded p-3 overflow-auto">
            {/* Gantt component */}
            <div style={{ minHeight: 360 }}>
              <Gantt tasks={ganttTasks} viewMode={view} onDateChange={onDateChange} onProgressChange={onProgressChange} />
            </div>
          </div>
        </div>

        {/* Form modal dentro del modal (crear/editar) */}
        {isFormOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-4">
              <h4 className="font-semibold mb-3">{editingId ? "Editar tarea" : "Nueva tarea"}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm">Nombre</label>
                  <input className="w-full border rounded px-2 py-1" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm">Responsable</label>
                  <input className="w-full border rounded px-2 py-1" value={form.responsible} onChange={(e) => setForm(p => ({ ...p, responsible: e.target.value }))} placeholder="Nombre responsable" />
                </div>
                <div>
                  <label className="block text-sm">Fecha inicio</label>
                  <input type="date" className="w-full border rounded px-2 py-1" value={dateToInputValue(new Date(form.start))} onChange={(e) => setForm(p => ({ ...p, start: inputToDate(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-sm">Fecha fin</label>
                  <input type="date" className="w-full border rounded px-2 py-1" value={dateToInputValue(new Date(form.end))} onChange={(e) => setForm(p => ({ ...p, end: inputToDate(e.target.value) }))} />
                </div>

                <div>
                  <label className="block text-sm">Estado</label>
                  <select className="w-full border rounded px-2 py-1" value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value as TaskStatus }))}>
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Progreso">En Progreso</option>
                    <option value="Completada">Completada</option>
                    <option value="Atrasada">Atrasada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm">Progreso (%)</label>
                  <input type="number" min={0} max={100} className="w-full border rounded px-2 py-1" value={form.progress} onChange={(e) => setForm(p => ({ ...p, progress: Number(e.target.value) }))} />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm">Descripción</label>
                  <textarea className="w-full border rounded px-2 py-1" rows={3} value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm">Dependencias</label>
                  <div className="mt-1 space-y-1 max-h-40 overflow-auto border p-2 rounded">
                    {tasks.filter(t => t.id !== editingId).length === 0 && <div className="text-xs text-gray-500">No hay tareas para depender.</div>}
                    {tasks.filter(t => t.id !== editingId).map(t => (
                      <label key={t.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.dependencies?.includes(t.id)} onChange={(e) => {
                          if (e.target.checked) setForm(p => ({ ...p, dependencies: Array.from(new Set([...(p.dependencies||[]), t.id])) }));
                          else setForm(p => ({ ...p, dependencies: (p.dependencies||[]).filter(id => id !== t.id) }));
                        }} />
                        <span>{t.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button className="px-3 py-1 rounded border" onClick={() => setIsFormOpen(false)}>Cancelar</button>
                <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={saveForm}>Guardar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* helpers */
function formatDateShort(d: Date | string) {
  const dt = new Date(d);
  return dt.toISOString().split("T")[0];
}
function dateToInputValue(d: Date) {
  return d.toISOString().split("T")[0];
}
function inputToDate(v: string) {
  return new Date(v + "T00:00:00");
}
function colorForStatus(status: TaskStatus) {
  switch (status) {
    case "Completada": return "#10B981";
    case "En Progreso": return "#F59E0B";
    case "Atrasada": return "#EF4444";
    default: return "#3B82F6";
  }
}
