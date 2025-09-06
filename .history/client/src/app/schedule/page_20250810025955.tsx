"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import "gantt-task-react/dist/index.css"; // estilos del Gantt
import Header from "@/app/(components)/Header";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";

/**
 * Nota:
 * - Usamos dynamic import para evitar errores SSR: `import { Gantt } from "gantt-task-react"`
 *   a veces falla en Next.js si se importa en servidor.
 * - Tipamos internamente las tareas para que TSX quede limpio.
 */

// dynamic import del componente Gantt (ssr: false)
const Gantt = dynamic(
  () => import("gantt-task-react").then((mod) => mod.Gantt),
  { ssr: false }
) as any;

/* --------------------------- Tipos / Interfaces -------------------------- */
type TaskStatus = "Pendiente" | "En Progreso" | "Completada" | "Atrasada";

interface ScheduleTask {
  id: string;
  name: string;
  description?: string;
  start: Date;
  end: Date;
  progress: number; // 0-100
  type?: "task" | "milestone" | "project";
  status: TaskStatus;
  responsible: string;
  dependencies?: string[]; // ids de otras tareas
}

/* ------------------------------- Componente ------------------------------ */
const ScheduleNow: React.FC = () => {
  // estado principal
  const [tasks, setTasks] = useState<ScheduleTask[]>(() => initialMockTasks());
  const [filterUser, setFilterUser] = useState<string>("Todos");
  const [filterStatus, setFilterStatus] = useState<string>("Todos");
  const [view, setView] = useState<"Day" | "Week" | "Month">("Week");

  // modal / form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ScheduleTask, "id">>({
    name: "",
    description: "",
    start: new Date(),
    end: new Date(new Date().setDate(new Date().getDate() + 3)),
    progress: 0,
    type: "task",
    status: "Pendiente",
    responsible: "",
    dependencies: [],
  });

  // tareas atrasadas (alertas)
  const delayedTasks = useMemo(() => {
    const now = new Date();
    return tasks.filter((t) => t.status !== "Completada" && t.end < startOfDay(now));
  }, [tasks]);

  // lista de responsables (derivada)
  const users = useMemo(() => ["Sin asignar", ...Array.from(new Set(tasks.map((t) => t.responsible)).values())].filter(Boolean), [tasks]);

  // filtered tasks para mostrarlas en Gantt
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const okUser = filterUser === "Todos" || t.responsible === filterUser;
      const okStatus = filterStatus === "Todos" || t.status === filterStatus;
      return okUser && okStatus;
    });
  }, [tasks, filterUser, filterStatus]);

  /* ------------------------ helpers: fechas / conversión ----------------------- */
  function dateToInputValue(d: Date) {
    return d.toISOString().split("T")[0];
  }

  function inputValueToDate(v: string) {
    return new Date(v + "T00:00:00");
  }

  function startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /* --------------------------- CRUD front (mock) ---------------------------- */
  const openNewTaskModal = () => {
    setEditingTaskId(null);
    setForm({
      name: "",
      description: "",
      start: new Date(),
      end: new Date(new Date().setDate(new Date().getDate() + 3)),
      progress: 0,
      type: "task",
      status: "Pendiente",
      responsible: "Sin asignar",
      dependencies: [],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (taskId: string) => {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    setEditingTaskId(taskId);
    setForm({
      name: t.name,
      description: t.description ?? "",
      start: new Date(t.start),
      end: new Date(t.end),
      progress: t.progress,
      type: t.type ?? "task",
      status: t.status,
      responsible: t.responsible,
      dependencies: t.dependencies ?? [],
    });
    setIsModalOpen(true);
  };

  const saveForm = () => {
    // validations mínimas
    if (!form.name.trim()) {
      alert("El nombre de la tarea es obligatorio.");
      return;
    }
    if (form.end < form.start) {
      alert("La fecha fin no puede ser anterior a la fecha inicio.");
      return;
    }

    if (editingTaskId) {
      // update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTaskId
            ? {
                ...t,
                name: form.name,
                description: form.description,
                start: new Date(form.start),
                end: new Date(form.end),
                progress: form.progress,
                status: form.progress >= 100 ? "Completada" : form.status,
                responsible: form.responsible,
                dependencies: form.dependencies ?? [],
              }
            : t
        )
      );
    } else {
      // create
      const newTask: ScheduleTask = {
        id: uuidv4(),
        name: form.name,
        description: form.description,
        start: new Date(form.start),
        end: new Date(form.end),
        progress: form.progress,
        type: form.type ?? "task",
        status: form.progress >= 100 ? "Completada" : form.status,
        responsible: form.responsible,
        dependencies: form.dependencies ?? [],
      };
      setTasks((prev) => [...prev, newTask]);
    }

    setIsModalOpen(false);
  };

  const deleteTask = (id: string) => {
    if (!confirm("¿Eliminar tarea?")) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // marcar completada rápido
  const toggleComplete = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: t.status === "Completada" ? "En Progreso" : "Completada", progress: t.status === "Completada" ? t.progress : 100 } : t
      )
    );
  };

  /* ------------------------ handlers del Gantt (on change) ----------------------- */
  const onDateChange = (changedTask: any) => {
    // changedTask: objeto que devuelve la librería con start/end/progress
    setTasks((prev) =>
      prev.map((t) => (t.id === changedTask.id ? { ...t, start: new Date(changedTask.start), end: new Date(changedTask.end) } : t))
    );
  };

  const onProgressChange = (changedTask: any) => {
    const newProgress = Number(changedTask.progress ?? 0);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === changedTask.id
          ? { ...t, progress: newProgress, status: newProgress >= 100 ? "Completada" : t.status === "Completada" ? "En Progreso" : t.status }
          : t
      )
    );
  };

  /* ------------------------------- efectos UI ------------------------------- */
  // recalcula estado "Atrasada" automáticamente (no sobreescribe completadas)
  useEffect(() => {
    const now = startOfDay(new Date());
    setTasks((prev) =>
      prev.map((t) => {
        if (t.status === "Completada") return t;
        if (t.end < now) {
          return { ...t, status: "Atrasada" as TaskStatus };
        }
        return t;
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // sólo on mount para demo; en real podrías usar interval o actualizar al cambiar tareas

  /* ------------------------------- Render UI ------------------------------- */
  return (
    <div className="p-4">
      <div className="mb-5">
        <Header name="Cronograma — Gestión de Tareas" />
        <p className="text-sm text-gray-500">Crear/Editar tareas, dependencias, Gantt y alertas.</p>
      </div>

      {/* alertas de retraso */}
      {delayedTasks.length > 0 && (
        <div className="mb-4 rounded bg-red-50 border border-red-200 p-3 text-red-700">
          ⚠️ Hay <strong>{delayedTasks.length}</strong> tarea(s) atrasada(s). Revisa el cronograma.
        </div>
      )}

      {/* controles: filtros + agregar */}
      <div className="mb-4 flex flex-col md:flex-row gap-3 items-center">
        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium mr-2">Usuario</label>
          <select className="border rounded px-2 py-1" value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
            <option value="Todos">Todos</option>
            {users.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium mr-2">Estado</label>
          <select className="border rounded px-2 py-1" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="Todos">Todos</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En Progreso">En Progreso</option>
            <option value="Completada">Completada</option>
            <option value="Atrasada">Atrasada</option>
          </select>
        </div>

        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium mr-2">Vista</label>
          <select className="border rounded px-2 py-1" value={view} onChange={(e) => setView(e.target.value as any)}>
            <option value="Day">Día</option>
            <option value="Week">Semana</option>
            <option value="Month">Mes</option>
          </select>
        </div>

        <div className="ml-auto">
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={openNewTaskModal}>➕ Nueva tarea</button>
        </div>
      </div>

      {/* layout: Gantt izquierda, lista derecha (responsive) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded shadow p-4">
          {/* Gantt */}
          {typeof window === "undefined" ? (
            <div>Cargando Gantt...</div>
          ) : (
            <Gantt
              tasks={filteredTasks.map(toGanttTask)}
              viewMode={view}
              onDateChange={onDateChange}
              onProgressChange={onProgressChange}
              // otras props disponibles: onDoubleClick, onSelect, etc.
            />
          )}
        </div>

        <div className="bg-white rounded shadow p-4">
          <h3 className="text-lg font-semibold mb-3">Lista de Tareas</h3>
          <div className="space-y-3">
            {filteredTasks.length === 0 && <div className="text-sm text-gray-500">No hay tareas.</div>}
            {filteredTasks.map((t) => (
              <div key={t.id} className="border rounded p-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-xs text-gray-500">
                      {format(t.start, "yyyy-MM-dd")} → {format(t.end, "yyyy-MM-dd")} • {t.responsible}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-sm px-2 py-1 border rounded" onClick={() => openEditModal(t.id)}>Editar</button>
                    <button className="text-sm px-2 py-1 border rounded" onClick={() => toggleComplete(t.id)}>{t.status === "Completada" ? "Marcar progreso" : "Marcar completada"}</button>
                    <button className="text-sm px-2 py-1 border rounded text-red-600" onClick={() => deleteTask(t.id)}>Eliminar</button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs">Estado: <strong>{t.status}</strong></div>
                  <div className="text-xs">Progreso: <strong>{t.progress}%</strong></div>
                </div>

                {t.dependencies && t.dependencies.length > 0 && (
                  <div className="text-xs text-gray-600">Depende de: {t.dependencies.map((id) => tasks.find((x) => x.id === id)?.name ?? id).join(", ")}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------- Modal (crear / editar) ------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl bg-white rounded shadow p-6">
            <h3 className="text-xl font-semibold mb-3">{editingTaskId ? "Editar tarea" : "Nueva tarea"}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">Nombre</label>
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="mt-1 w-full border rounded px-2 py-1" />
              </div>

              <div>
                <label className="block text-sm font-medium">Responsable</label>
                <input value={form.responsible} onChange={(e) => setForm((p) => ({ ...p, responsible: e.target.value }))} className="mt-1 w-full border rounded px-2 py-1" placeholder="Nombre del responsable" />
              </div>

              <div>
                <label className="block text-sm font-medium">Fecha inicio</label>
                <input type="date" value={dateToInputValue(form.start)} onChange={(e) => setForm((p) => ({ ...p, start: inputValueToDate(e.target.value) }))} className="mt-1 w-full border rounded px-2 py-1" />
              </div>

              <div>
                <label className="block text-sm font-medium">Fecha fin</label>
                <input type="date" value={dateToInputValue(form.end)} onChange={(e) => setForm((p) => ({ ...p, end: inputValueToDate(e.target.value) }))} className="mt-1 w-full border rounded px-2 py-1" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium">Descripción</label>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="mt-1 w-full border rounded px-2 py-1" rows={3} />
              </div>

              <div>
                <label className="block text-sm font-medium">Estado</label>
                <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as TaskStatus }))} className="mt-1 w-full border rounded px-2 py-1">
                  <option value="Pendiente">Pendiente</option>
                  <option value="En Progreso">En Progreso</option>
                  <option value="Completada">Completada</option>
                  <option value="Atrasada">Atrasada</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium">Progreso (%)</label>
                <input type="number" min={0} max={100} value={form.progress} onChange={(e) => setForm((p) => ({ ...p, progress: Number(e.target.value) }))} className="mt-1 w-full border rounded px-2 py-1" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium">Dependencias</label>
                <div className="mt-1 space-y-1 max-h-40 overflow-auto border p-2 rounded">
                  {tasks.filter(t => t.id !== editingTaskId).length === 0 && <div className="text-xs text-gray-500">No hay otras tareas.</div>}
                  {tasks.filter(t => t.id !== editingTaskId).map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.dependencies?.includes(t.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm(p => ({ ...p, dependencies: Array.from(new Set([...(p.dependencies||[]), t.id])) }));
                          } else {
                            setForm(p => ({ ...p, dependencies: (p.dependencies || []).filter(id => id !== t.id) }));
                          }
                        }}
                      />
                      <span>{t.name} — {format(t.start, "yyyy-MM-dd")}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-1 rounded border" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={saveForm}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ----------------------------- util / mapping ---------------------------- */

// convierte nuestra ScheduleTask a la forma que espera gantt-task-react
function toGanttTask(t: ScheduleTask) {
  return {
    id: t.id,
    name: t.name,
    start: new Date(t.start),
    end: new Date(t.end),
    type: t.type ?? "task",
    progress: t.progress,
    isDisabled: false,
    project: "",
    dependencies: t.dependencies ?? [],
    // meta (lo mantenemos para referencia)
    styles: { progressColor: progressColorForStatus(t.status) },
  };
}

function progressColorForStatus(status: TaskStatus) {
  switch (status) {
    case "Completada": return "#10B981"; // verde
    case "En Progreso": return "#F59E0B"; // amarillo
    case "Atrasada": return "#EF4444"; // rojo
    default: return "#3B82F6"; // azul
  }
}

/* ---------------------------- datos iniciales ---------------------------- */
function initialMockTasks(): ScheduleTask[] {
  const t1Start = new Date();
  const t1End = new Date();
  t1End.setDate(t1Start.getDate() + 3);

  const t2Start = new Date();
  t2Start.setDate(t1End.getDate() + 1);
  const t2End = new Date();
  t2End.setDate(t2Start.getDate() + 4);

  const id1 = uuidv4();
  const id2 = uuidv4();

  return [
    {
      id: id1,
      name: "Planificación inicial",
      description: "Definición de alcance y entregables",
      start: t1Start,
      end: t1End,
      progress: 10,
      type: "task",
      status: "En Progreso",
      responsible: "Carlos Gómez",
      dependencies: [],
    },
    {
      id: id2,
      name: "Compra de materiales",
      description: "Cemento, ladrillo y acero",
      start: t2Start,
      end: t2End,
      progress: 0,
      type: "task",
      status: "Pendiente",
      responsible: "María López",
      dependencies: [id1],
    },
  ];
}

export default ScheduleNow;
