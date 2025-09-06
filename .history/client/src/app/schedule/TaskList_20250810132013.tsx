// components/cronograma/TaskList.tsx
"use client";
import React from "react";
import { TaskExtended } from "./types";
import { formatDateShort } from "./helpers";

type Props = {
  tasks: TaskExtended[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string) => void;
  openCreate: () => void;
  setViewMode: (v: any) => void;
  viewMode: any;
};

export default function TaskList({ tasks, onEdit, onDelete, onToggleComplete, openCreate, setViewMode, viewMode }: Props) {
  // summary per person
  const people = Array.from(new Set(["Sin asignar", ...tasks.map((t) => t.responsible ?? "Sin asignar")]));
  const summary = people.map((p) => {
    const personTasks = tasks.filter((t) => (t.responsible ?? "Sin asignar") === p);
    const avgMaterial = personTasks.length === 0 ? 0 : Math.round((personTasks.reduce((s, x) => s + (x.materialPercent ?? 0), 0) / personTasks.length) * 10) / 10;
    const progressAvg = personTasks.length === 0 ? 0 : Math.round((personTasks.reduce((s, x) => s + (x.progress ?? 0), 0) / personTasks.length) * 10) / 10;
    return { person: p, count: personTasks.length, avgMaterial, progressAvg };
  });

  return (
    <div className="lg:col-span-1 bg-gray-50 rounded p-3 space-y-3">
      <div className="flex items-center justify-between">
        <strong>Cronograma</strong>
        <div className="flex gap-2">
          <button className="px-2 py-1 rounded bg-green-600 text-white" onClick={openCreate}>+ Nueva</button>
          <select className="border rounded px-2 py-1" value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
            <option value={"Day"}>Día</option>
            <option value={"Week"}>Semana</option>
            <option value={"Month"}>Mes</option>
          </select>
        </div>
      </div>

      <div className="space-y-2 max-h-[40vh] overflow-auto pr-2">
        {tasks.length === 0 && <div className="text-sm text-gray-500">No hay tareas.</div>}
        {tasks.map((t) => (
          <div key={t.id} className="bg-white border rounded p-2">
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="font-semibold text-sm">{t.name}</div>
                <div className="text-xs text-gray-500">{formatDateShort(t.start)} → {formatDateShort(t.end)}</div>
                <div className="text-xs text-gray-600">Responsable: {t.responsible} • Mat: {t.materialPercent ?? 0}%</div>
              </div>
              <div className="flex flex-col gap-1">
                <button className="text-xs px-2 py-1 border rounded" onClick={() => onEdit(t.id)}>Editar</button>
                <button className="text-xs px-2 py-1 border rounded" onClick={() => onToggleComplete(t.id)}>{t.status === "Completada" ? "Desmarcar" : "Completar"}</button>
                <button className="text-xs px-2 py-1 border rounded text-red-600" onClick={() => onDelete(t.id)}>Eliminar</button>
              </div>
            </div>
            <div className="mt-2 text-xs">
              Estado: <strong>{t.status}</strong> • Progreso: <strong>{t.progress}%</strong>
              {t.dependencies && t.dependencies.length > 0 && (
                <div className="text-xs text-gray-600">Depende de: {t.dependencies.join(", ")}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 bg-white p-2 rounded border">
        <div className="font-semibold text-sm mb-1">Resumen por persona</div>
        {summary.map((s) => (
          <div key={s.person} className="flex justify-between text-xs py-1 border-b last:border-b-0">
            <div>
              <div className="font-medium">{s.person}</div>
              <div className="text-gray-500">Tareas: {s.count}</div>
            </div>
            <div className="text-right">
              <div>Mat: <strong>{s.avgMaterial}%</strong></div>
              <div>Prog: <strong>{s.progressAvg}%</strong></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
