// types.ts
import type { Task } from "gantt-task-react";

export type TaskStatus = "Pendiente" | "En Progreso" | "Completada" | "Atrasada";

export interface TaskExtended extends Task {
  // Task (de gantt-task-react) ya trae: id, name, start, end, type, progress, isDisabled, dependencies...
  responsible: string;
  status: TaskStatus;
  description?: string;
}

export interface Project {
  id: string;
  name: string;
  start: Date;
  end: Date;
  tasks: TaskExtended[];
}
