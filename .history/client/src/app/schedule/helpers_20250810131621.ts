// components/cronograma/helpers.ts
import { TaskStatus } from "./types";

export function formatDateShort(d: Date | string) {
  const dt = new Date(d);
  return dt.toISOString().split("T")[0];
}
export function dateToInputValue(d: Date) {
  return d.toISOString().split("T")[0];
}
export function inputToDate(v: string) {
  return new Date(v + "T00:00:00");
}
export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function colorForStatus(status: TaskStatus) {
  switch (status) {
    case "Completada":
      return "#10B981";
    case "En Progreso":
      return "#F59E0B";
    case "Atrasada":
      return "#EF4444";
    default:
      return "#3B82F6";
  }
}

export const genId = (prefix = "t") => prefix + Math.random().toString(36).slice(2, 9);
