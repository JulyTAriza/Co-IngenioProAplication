"use client";

import React, { useState } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { Project, TaskExtended } from "./types";
import { X, Plus } from "lucide-react";

interface Props {
  project: Project;
  onClose: () => void;
  onSave: (project: Project) => void;
}

export default function GanttModal({ project, onClose, onSave }: Props) {
  const [tasks, setTasks] = useState<TaskExtended[]>(project.tasks || []);
  const [view, setView] = useState<ViewMode>(ViewMode.Day);

  const addTask = () => {
    const newTask: TaskExtended = {
      id: `t${tasks.length + 1}`,
      name: `Nueva Tarea ${tasks.length + 1}`,
      start: new Date(),
      end: new Date(new Date().setDate(new Date().getDate() + 5)),
      type: "task",
      progress: 0,
      dependencies: [],
      isDisabled: false,
      styles: { progressColor: "#6a5acd", progressSelectedColor: "#483d8b" },
      responsible: "",
      status: "Pendiente",
    };
    setTasks([...tasks, newTask]);
  };

  const updateTask = (taskId: string, updates: Partial<TaskExtended>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    );
  };

  const handleSave = () => {
    onSave({ ...project, tasks });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-11/12 max-w-6xl p-6 relative">
        <button
          className="absolute top-4 right-4 text-gray-600 hover:text-black"
          onClick={onClose}
        >
          <X size={24} />
        </button>

        <h2 className="text-xl font-semibold mb-4">
          Cronograma: {project.name}
        </h2>

        <div className="mb-4 flex justify-between items-center">
          <button
            className="bg-green-500 text-white px-3 py-1 rounded-lg flex items-center gap-2"
            onClick={addTask}
          >
            <Plus size={16} /> Agregar Tarea
          </button>
          <select
            className="border rounded px-2 py-1"
            value={view}
            onChange={(e) => setView(e.target.value as ViewMode)}
          >
            <option value={ViewMode.Day}>Día</option>
            <option value={ViewMode.Week}>Semana</option>
            <option value={ViewMode.Month}>Mes</option>
          </select>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Gantt tasks={tasks as Task[]} viewMode={view} />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            className="bg-gray-300 px-4 py-2 rounded-lg"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
            onClick={handleSave}
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
