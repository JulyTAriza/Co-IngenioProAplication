// components/cronograma/TaskList.tsx
"use client";
import React from "react";
import { TaskExtended } from "./types";

type Props = {
  tasks: TaskExtended[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string) => void;
  openCreate: () => void;
  setViewMode: (mode: string) => void;
  viewMode: string;
};

export default function TaskList({
  tasks,
  onEdit,
  onDelete,
  onToggleComplete,
  openCreate,
  setViewMode,
  viewMode,
}: Props) {
  // Agrupar tareas por grupo/fase
  const grupos = tasks.reduce((acc, task) => {
    const grupo = task.grupo ?? "General";
    if (!acc[grupo]) acc[grupo] = [];
    acc[grupo].push(task);
    return acc;
  }, {} as Record<string, TaskExtended[]>);

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold">Cronograma</h4>
        <button
          className="px-3 py-1 bg-green-600 text-white rounded text-sm"
          onClick={openCreate}
        >
          + Nueva
        </button>
      </div>

      {/* Selector de vista */}
      <div className="mb-4">
        <label className="text-sm text-gray-600 mr-2">Vista:</label>
        <select
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="Day">Día</option>
          <option value="Week">Semana</option>
          <option value="Month">Mes</option>
        </select>
      </div>

      {/* Lista de tareas agrupadas */}
      {Object.entries(grupos).map(([grupo, tareas]) => {
        const completadas = tareas.filter((t) => t.status === "Completada").length;
        return (
          <div key={grupo} className="mb-6">
            <h5 className="text-sm font-semibold mb-2">
              {grupo} — {completadas}/{tareas.length} tareas completadas
            </h5>
            <div className="space-y-2">
              {tareas.map((t) => (
                <div
                  key={t.id}
                  className="border rounded p-3 bg-gray-50 flex flex-col gap-1 text-sm"
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium">{t.name}</div>
                    <div className="flex gap-2">
                      <button
                        className="text-blue-600 hover:underline"
                        onClick={() => onEdit(t.id)}
                      >
                        Editar
                      </button>
                      <button
                        className="text-green-600 hover:underline"
                        onClick={() => onToggleComplete(t.id)}
                      >
                        {t.status === "Completada" ? "Descompletar" : "Completar"}
                      </button>
                      <button
                        className="text-red-600 hover:underline"
                        onClick={() => onDelete(t.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  <div className="text-gray-600">
                    {t.start.toLocaleDateString()} → {t.end.toLocaleDateString()}
                  </div>
                  <div className="text-gray-600">
                    Responsable: <strong>{t.responsible}</strong> • Estado:{" "}
                    <strong>{t.status}</strong> • Progreso: {t.progress}%
                  </div>
                  <div className="text-gray-600">
                    Material: {t.materialPercent ?? 0}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

