"use client";

import React, { useState } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import dayjs from "dayjs";

const SchedulePage: React.FC = () => {
  // Escala de la vista (Día, Semana, Mes)
  const [view, setView] = useState<ViewMode>(ViewMode.Day);

  // Datos de ejemplo (esto puede venir de una API en producción)
  const tasks: Task[] = [
    {
      id: "1",
      name: "Planificación del Proyecto",
      start: new Date(2025, 0, 1),
      end: new Date(2025, 0, 5),
      type: "task",
      progress: 45,
      isDisabled: false,
      styles: { progressColor: "#4cafef", progressSelectedColor: "#3b82f6" }
    },
    {
      id: "2",
      name: "Diseño de Arquitectura",
      start: new Date(2025, 0, 6),
      end: new Date(2025, 0, 10),
      type: "task",
      progress: 20,
      dependencies: ["1"],
      styles: { progressColor: "#ff9800", progressSelectedColor: "#f57c00" }
    },
    {
      id: "3",
      name: "Desarrollo Backend",
      start: new Date(2025, 0, 11),
      end: new Date(2025, 0, 20),
      type: "task",
      progress: 10,
      dependencies: ["2"],
      styles: { progressColor: "#4caf50", progressSelectedColor: "#388e3c" }
    },
    {
      id: "4",
      name: "Pruebas e Integración",
      start: new Date(2025, 0, 21),
      end: new Date(2025, 0, 25),
      type: "task",
      progress: 0,
      dependencies: ["3"],
      styles: { progressColor: "#e91e63", progressSelectedColor: "#ad1457" }
    }
  ];

  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>
        📅 Gestión de Cronogramas
      </h1>

      {/* Selector de vista */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ marginRight: "1rem", fontWeight: "bold" }}>
          Vista:
        </label>
        <select
          value={view}
          onChange={(e) => setView(e.target.value as ViewMode)}
          style={{
            padding: "0.5rem",
            borderRadius: "6px",
            border: "1px solid #ccc"
          }}
        >
          <option value={ViewMode.Day}>Día</option>
          <option value={ViewMode.Week}>Semana</option>
          <option value={ViewMode.Month}>Mes</option>
        </select>
      </div>

      {/* Componente Gantt */}
      <div style={{ background: "#fff", borderRadius: "10px", padding: "1rem", boxShadow: "0 0 10px rgba(0,0,0,0.1)" }}>
        <Gantt
          tasks={tasks}
          viewMode={view}
          locale="es"
          barCornerRadius={6}
          rowHeight={40}
          columnWidth={view === ViewMode.Month ? 150 : 65}
        />
      </div>
    </div>
  );
};

export default SchedulePage;
