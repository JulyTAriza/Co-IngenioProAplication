"use client";

import React, { useState } from "react";
import { useGetMyTasksListQuery, useCompleteMyTaskMutation, useReopenMyTaskMutation } from "@/state/api";
import { CheckCircle2, Circle, Calendar, FolderOpen, Layers, ArrowRight } from "lucide-react";

type TaskStatus = "pending" | "completed";

const MyTasks = () => {
  const { data, isLoading, error } = useGetMyTasksListQuery();
  const [completeTask] = useCompleteMyTaskMutation();
  const [reopenTask] = useReopenMyTaskMutation();
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  const handleCompleteTask = async (taskId: number) => {
    try {
      await completeTask(taskId).unwrap();
      console.log("✅ Tarea completada");
    } catch (error) {
      console.error("❌ Error completando tarea:", error);
    }
  };

  const handleReopenTask = async (taskId: number) => {
    try {
      await reopenTask(taskId).unwrap();
      console.log("✅ Tarea reabierta");
    } catch (error) {
      console.error("❌ Error reabriendo tarea:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-600 font-medium">Error cargando tareas</p>
        </div>
      </div>
    );
  }

  const pendingTasks = data?.pending || [];
  const completedTasks = data?.completed || [];

  const filteredPending = filter === "completed" ? [] : pendingTasks;
  const filteredCompleted = filter === "pending" ? [] : completedTasks;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">📋 Mis Tareas</h1>
        <p className="text-gray-600">Gestiona tus actividades asignadas</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-800">
                {pendingTasks.length + completedTasks.length}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Layers className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-gray-800">{pendingTasks.length}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <Circle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completadas</p>
              <p className="text-2xl font-bold text-gray-800">{completedTasks.length}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === "all"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === "pending"
              ? "bg-yellow-600 text-white"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          Pendientes
        </button>
        <button
          onClick={() => setFilter("completed")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === "completed"
              ? "bg-green-600 text-white"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          Completadas
        </button>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TO DO Column */}
        {filter !== "completed" && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b">
              <Circle className="w-5 h-5 text-yellow-600" />
              <h2 className="text-lg font-bold text-gray-800">
                Por Hacer ({filteredPending.length})
              </h2>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredPending.length === 0 ? (
                <p className="text-center text-gray-400 py-8">
                  ¡No tienes tareas pendientes! 🎉
                </p>
              ) : (
                filteredPending.map((task) => (
                  <div
                    key={task.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-800">{task.name}</h3>
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        className="bg-green-500 hover:bg-green-600 text-white p-1 rounded-full transition-colors"
                        title="Completar tarea"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    </div>

                    {task.description && (
                      <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                    )}

                    <div className="flex flex-col gap-2 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <FolderOpen className="w-4 h-4" />
                        <span>{task.project}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Layers className="w-4 h-4" />
                        <span>{task.stage}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(task.startDate).toLocaleDateString()} -{" "}
                          {new Date(task.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Indicador de urgencia */}
                    {new Date(task.endDate) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) && (
                      <div className="mt-3 bg-red-50 border border-red-200 rounded px-2 py-1 text-xs text-red-600 font-medium">
                        ⚠️ Vence pronto
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* DONE Column */}
        {filter !== "pending" && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-bold text-gray-800">
                Completadas ({filteredCompleted.length})
              </h2>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredCompleted.length === 0 ? (
                <p className="text-center text-gray-400 py-8">
                  Aún no has completado tareas
                </p>
              ) : (
                filteredCompleted.map((task) => (
                  <div
                    key={task.id}
                    className="bg-green-50 rounded-lg p-4 border border-green-200 opacity-75 hover:opacity-100 transition-opacity"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-800 line-through">
                        {task.name}
                      </h3>
                      <button
                        onClick={() => handleReopenTask(task.id)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white p-1 rounded-full transition-colors"
                        title="Reabrir tarea"
                      >
                        <ArrowRight className="w-5 h-5 rotate-180" />
                      </button>
                    </div>

                    {task.description && (
                      <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                    )}

                    <div className="flex flex-col gap-2 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <FolderOpen className="w-4 h-4" />
                        <span>{task.project}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Layers className="w-4 h-4" />
                        <span>{task.stage}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="font-medium">Completada</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTasks;