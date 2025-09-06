// page.tsx
"use client";

import React, { useState } from "react";
import GanttModal from "./GanttModal";
import { Project } from "./types";


export default function SchedulePage() {
  const [projects, setProjects] = useState<Project[]>(() => [
    {
      id: "p1",
      name: "Construcción de Oficina",
      start: new Date(),
      end: new Date(new Date().setDate(new Date().getDate() + 30)),
      tasks: [], // viene vacío o puedes prellenar
    },
  ]);

  const [selected, setSelected] = useState<Project | null>(null);

  const createProject = () => {
    const id = "p" + Math.random().toString(36).slice(2, 8);
    setProjects(prev => [
      ...prev,
      {
        id,
        name: `Proyecto ${prev.length + 1}`,
        start: new Date(),
        end: new Date(new Date().setDate(new Date().getDate() + 30)),
        tasks: [],
      },
    ]);
  };

  const saveProject = (updated: Project) => {
    setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    setSelected(null);
  };

  return (
    <div className="p-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Cronogramas</h1>
          <p className="text-sm text-gray-500">Gestiona cronogramas por proyecto</p>
        </div>
        <div>
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={createProject}>
            + Nuevo Cronograma
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map(p => (
          <div key={p.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
            <div>
              <div className="font-semibold">{p.name}</div>
              <div className="text-xs text-gray-500">{p.start.toISOString().split("T")[0]} → {p.end.toISOString().split("T")[0]}</div>
            </div>
            <div>
              <button className="px-3 py-1 border rounded" onClick={() => setSelected(p)}>Abrir</button>
            </div>
          </div>
        ))}
      </div>

      {selected && <GanttModal project={selected} onClose={() => setSelected(null)} onSave={saveProject} />}
    </div>
  );
}
