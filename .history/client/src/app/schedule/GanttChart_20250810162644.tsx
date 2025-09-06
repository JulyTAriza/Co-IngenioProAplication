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
  const ganttTasks: Task[] =
    tasks
      .filter(
        (t) =>
          t.start &&
          t.end &&
          !isNaN(new Date(t.start).getTime()) &&
          !isNaN(new Date(t.end).getTime())
      )
      .map((t) => ({
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
          backgroundColor: "#F0F4FF", // fondo suave
          progressSelectedColor: "#4F46E5", // azul intenso al seleccionar
          backgroundSelectedColor: "#E0E7FF", // fondo al seleccionar
        },
      }));

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
      <Gantt
        tasks={tasksToRender}
        viewMode={view}
        onDateChange={onDateChange}
        onProgressChange={onProgressChange}
        locale="es" // si quieres que los días y meses estén en español
      />
    </div>
  );
}
