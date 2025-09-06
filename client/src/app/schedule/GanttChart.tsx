// components/cronograma/GanttChart.tsx
"use client";
import React from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { colorForStatus } from "./helpers";
import { TaskExtended } from "./types";

type Props = {
  tasks: TaskExtended[];
  view: ViewMode;
  onDateChange: (changed: any) => void;
  onProgressChange: (changed: any) => void;
};

export default function GanttChart({
  tasks,
  view,
  onDateChange,
  onProgressChange,
}: Props) {
  // Agrupación opcional por fase/sprint si el campo existe
  const groupedTasks = tasks.reduce((acc, task) => {
    const group = task.grupo ?? "General";
    if (!acc[group]) acc[group] = [];
    acc[group].push(task);
    return acc;
  }, {} as Record<string, TaskExtended[]>);

  const ganttTasks: Task[] = [];

  Object.entries(groupedTasks).forEach(([grupo, tareas]) => {
    // Tarea tipo "project" como encabezado de grupo
    const groupStart = new Date(Math.min(...tareas.map(t => new Date(t.start).getTime())));
    const groupEnd = new Date(Math.max(...tareas.map(t => new Date(t.end).getTime())));

    ganttTasks.push({
      id: `grupo-${grupo}`,
      name: grupo,
      start: groupStart,
      end: groupEnd,
      type: "project",
      progress: 0,
      isDisabled: true,
    });

    tareas.forEach(t => {
      ganttTasks.push({
        id: t.id,
        name: `${t.name} (${t.progress}%)`,
        start: new Date(t.start),
        end: new Date(t.end),
        type: t.type ?? "task",
        progress: Math.min(100, Math.max(0, Number(t.progress || 0))),
        isDisabled: !!t.isDisabled,
        dependencies: t.dependencies ?? [],
        styles: {
          progressColor: colorForStatus(t.status ?? "Pendiente"),
          backgroundColor: "#F0F4FF",
          progressSelectedColor: "#4F46E5",
          backgroundSelectedColor: "#E0E7FF",
        },
      });
    });
  });

  const tasksToRender =
    ganttTasks.length > 0
      ? ganttTasks
      : [
          {
            id: "placeholder",
            name: "Sin tareas programadas",
            start: new Date(),
            end: new Date(Date.now() + 24 * 60 * 60 * 1000),
            type: "task",
            progress: 0,
            isDisabled: true,
          } as Task,
        ];

  return (
    <div className="rounded-xl border shadow-md p-4 bg-white overflow-auto" style={{ minHeight: 360 }}>
      {ganttTasks.length > 0 ? (
        <Gantt
          tasks={tasksToRender}
          viewMode={view}
          onDateChange={onDateChange}
          onProgressChange={onProgressChange}
          locale="es"
        />
      ) : (
        <div className="text-center text-gray-500 py-10">
          <p className="text-lg">No hay tareas programadas aún.</p>
          <p>Haz clic en <strong>+ Nueva</strong> para comenzar a planificar.</p>
        </div>
      )}
    </div>
  );
}
