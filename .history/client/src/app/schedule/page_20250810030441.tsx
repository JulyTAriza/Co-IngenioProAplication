import React, { useState } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import dayjs from "dayjs";

const ScheduleModule: React.FC = () => {
  // Estado de tareas
  const [tasks, setTasks] = useState<Task[]>([
    {
      start: new Date(2025, 0, 1),
      end: new Date(2025, 0, 10),
      name: "Planificación del proyecto",
      id: "1",
      type: "task",
      progress: 40,
      isDisabled: false,
    },
    {
      start: new Date(2025, 0, 11),
      end: new Date(2025, 0, 20),
      name: "Desarrollo",
      id: "2",
      type: "task",
      progress: 20,
      isDisabled: false,
    },
  ]);

  const [view, setView] = useState<ViewMode>(ViewMode.Month);

  // Crear tarea
  const addTask = () => {
    const newId = (tasks.length + 1).toString();
    const newTask: Task = {
      start: new Date(),
      end: dayjs().add(5, "day").toDate(),
      name: `Nueva tarea ${newId}`,
      id: newId,
      type: "task",
      progress: 0,
      isDisabled: false,
    };
    setTasks([...tasks, newTask]);
  };

  // Editar tarea (solo ejemplo, actualiza nombre)
  const editTask = (id: string, newName: string) => {
    setTasks(tasks.map((task) => (task.id === id ? { ...task, name: newName } : task)));
  };

  // Eliminar tarea
  const deleteTask = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id));
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>📅 Gestión de Cronogramas</h2>

      {/* Controles */}
      <div style={{ marginBottom: "10px" }}>
        <button onClick={() => setView(ViewMode.Day)}>Vista Día</button>
        <button onClick={() => setView(ViewMode.Week)}>Vista Semana</button>
        <button onClick={() => setView(ViewMode.Month)}>Vista Mes</button>
        <button onClick={addTask}>➕ Agregar tarea</button>
      </div>

      {/* Tabla rápida para editar/eliminar */}
      <table border={1} cellPadding={5} style={{ marginBottom: "20px" }}>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Inicio</th>
            <th>Fin</th>
            <th>Progreso</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td>{task.name}</td>
              <td>{dayjs(task.start).format("YYYY-MM-DD")}</td>
              <td>{dayjs(task.end).format("YYYY-MM-DD")}</td>
              <td>{task.progress}%</td>
              <td>
                <button onClick={() => editTask(task.id, prompt("Nuevo nombre:", task.name) || task.name)}>
                  ✏ Editar
                </button>
                <button onClick={() => deleteTask(task.id)}>🗑 Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Gantt */}
      <Gantt tasks={tasks} viewMode={view} />
    </div>
  );
};

export default ScheduleModule;
