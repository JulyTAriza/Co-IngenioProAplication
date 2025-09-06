// components/cronograma/types.ts
export type TaskStatus = "Pendiente" | "En Progreso" | "Completada" | "Atrasada";

export type TaskExtended = {
  id: string;
  name: string;
  start: Date;
  end: Date;
  type?: "task" | "milestone";
  progress: number;
  isDisabled?: boolean;
  dependencies?: string[]; // ids
  responsible?: string;
  status?: TaskStatus;
  description?: string;
  materialPercent?: number; // porcentaje de material gastado por la persona en esta tarea (0-100)
};

export type Project = {
  id: string;
  name: string;
  start: Date;
  end: Date;
  tasks?: TaskExtended[];
};
