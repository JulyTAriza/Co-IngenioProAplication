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
      // Filtramos tareas sin fechas válidas
      .filter((t) => t.start && t.end && !isNaN(new Date(t.start).getTime()) && !isNaN(new Date(t.end).getTime()))
      // Convertimos al formato que Gantt espera
      .map((t) => ({
        id: t.id,
        name: t.name,
        start: new Date(t.start),
        end: new Date(t.end),
        type: t.type ?? "task",
        progress: Math.min(100, Math.max(0, Number(t.progress || 0))),
        isDisabled: !!t.isDisabled,
        dependencies: t.dependencies ?? [],
        styles: {
          progressColor: colorForStatus(t.status ?? "Pendiente"),
        },
      }));

  // 3️ Placeholder para evitar romper si no hay tareas válidas
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
    <div style={{ minHeight: 360 }}>
      <Gantt
        tasks={tasksToRender}
        viewMode={view}
        onDateChange={onDateChange}
        onProgressChange={onProgressChange}
      />
    </div>
  );
}
