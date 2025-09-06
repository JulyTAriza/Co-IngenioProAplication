// components/cronograma/types.ts

export type TaskStatus = "Pendiente" | "En Progreso" | "Completada" | "Atrasada";

export type TaskExtended = {
  id: string;
  name: string;
  start: Date;
  end: Date;
  type?: "task" | "milestone"; // puedes agregar más tipos si lo deseas
  progress: number;
  isDisabled?: boolean;
  dependencies?: string[]; // ids de otras tareas
  responsible?: string;
  status?: TaskStatus;
  description?: string;
  materialPercent?: number; // porcentaje de material gastado por la persona en esta tarea (0-100)
  grupo?: string; // ← nuevo campo para agrupar tareas por fase/sprint
};

export type Project = {
  id: string;
  name: string;
  start: Date;
  end: Date;
  tasks?: TaskExtended[];
};
