import { Task } from "gantt-task-react";

export interface TaskExtended extends Task {
  responsible: string;
  status: "Pendiente" | "En Progreso" | "Completada" | "Retrasada";
}

export interface Project {
  id: string;
  name: string;
  start: Date;
  end: Date;
  tasks: TaskExtended[];
}
