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

export default function GanttChart({ tasks, view, onDateChange, onProgressChange }: Props) {
  const ganttTasks: Task[] = tasks.map((t) => ({
    id: t.id,
    name: t.name,
    start: new Date(t.start),
    end: new Date(t.end),
    type: t.type ?? "task",
    progress: Math.min(100, Math.max(0, Number(t.progress || 0))),
    isDisabled: !!t.isDisabled,
    dependencies: t.dependencies ?? [],
    styles: { progressColor: colorForStatus(t.status ?? "Pendiente") },
  }));

  return (
    <div style={{ minHeight: 360 }}>
      <Gantt tasks={ganttTasks} viewMode={view} onDateChange={onDateChange} onProgressChange={onProgressChange} />
    </div>
  );
}
