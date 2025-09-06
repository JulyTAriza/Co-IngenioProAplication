// components/cronograma/TaskForm.tsx
"use client";
import React from "react";
import { TaskExtended, TaskStatus } from "./types";
import { dateToInputValue, inputToDate } from "./helpers";

type Props = {
  editingId: string | null;
  form: Omit<TaskExtended, "id">;
  tasks: TaskExtended[];
  onChange: (patch: Partial<Omit<TaskExtended, "id">>) => void;
  onCancel: () => void;
  onSave: () => void;
};

export default function TaskForm({ editingId, form, tasks, onChange, onCancel, onSave }: Props) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-4">
        <h4 className="font-semibold mb-3">{editingId ? "Editar tarea" : "Nueva tarea"}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm">Nombre</label>
            <input className="w-full border rounded px-2 py-1" value={form.name} onChange={(e) => onChange({ name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm">Responsable</label>
            <input className="w-full border rounded px-2 py-1" value={form.responsible} onChange={(e) => onChange({ responsible: e.target.value })} placeholder="Nombre responsable" />
          </div>
          <div>
            <label className="block text-sm">Fecha inicio</label>
            <input type="date" className="w-full border rounded px-2 py-1" value={dateToInputValue(new Date(form.start))} onChange={(e) => onChange({ start: inputToDate(e.target.value) })} />
          </div>
          <div>
            <label className="block text-sm">Fecha fin</label>
            <input type="date" className="w-full border rounded px-2 py-1" value={dateToInputValue(new Date(form.end))} onChange={(e) => onChange({ end: inputToDate(e.target.value) })} />
          </div>

          <div>
            <label className="block text-sm">Tipo</label>
            <select className="w-full border rounded px-2 py-1" value={form.type} onChange={(e) => onChange({ type: e.target.value as any })}>
              <option value="task">Tarea</option>
              <option value="milestone">Hito</option>
            </select>
          </div>

          <div>
            <label className="block text-sm">Estado</label>
            <select className="w-full border rounded px-2 py-1" value={form.status} onChange={(e) => onChange({ status: e.target.value as TaskStatus })}>
              <option value="Pendiente">Pendiente</option>
              <option value="En Progreso">En Progreso</option>
              <option value="Completada">Completada</option>
              <option value="Atrasada">Atrasada</option>
            </select>
          </div>

          <div>
            <label className="block text-sm">Progreso (%)</label>
            <input type="number" min={0} max={100} className="w-full border rounded px-2 py-1" value={form.progress} onChange={(e) => onChange({ progress: Number(e.target.value) })} />
          </div>

          <div>
            <label className="block text-sm">Material gastado (%)</label>
            <input type="number" min={0} max={100} className="w-full border rounded px-2 py-1" value={form.materialPercent} onChange={(e) => onChange({ materialPercent: Number(e.target.value) })} />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm">Descripción</label>
            <textarea className="w-full border rounded px-2 py-1" rows={3} value={form.description} onChange={(e) => onChange({ description: e.target.value })} />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm">Dependencias</label>
            <div className="mt-1 space-y-1 max-h-40 overflow-auto border p-2 rounded">
              {tasks.length === 0 && <div className="text-xs text-gray-500">No hay tareas para depender.</div>}
              {tasks.map(t => (
                <label key={t.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={(form.dependencies ?? []).includes(t.id)}
                    onChange={(e) => {
                      if (e.target.checked) onChange({ dependencies: Array.from(new Set([...(form.dependencies ?? []), t.id])) });
                      else onChange({ dependencies: (form.dependencies ?? []).filter(id => id !== t.id) });
                    }}
                  />
                  <span>{t.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="px-3 py-1 rounded border" onClick={onCancel}>Cancelar</button>
          <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={onSave}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
