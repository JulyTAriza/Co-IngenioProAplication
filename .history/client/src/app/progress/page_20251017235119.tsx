"use client";

import React, { useState } from "react";
import {
  useGetAllProjectsProgressQuery,
  useGetAllUsersProgressQuery,
  useGetOverallProgressSummaryQuery,
} from "@/state/api";
import { BarChart3, Users, FolderOpen, TrendingUp, CheckCircle2, Clock } from "lucide-react";

const ProgressMonitoring = () => {
  const { data: projectsData, isLoading: projectsLoading } = useGetAllProjectsProgressQuery();
  const { data: usersData, isLoading: usersLoading } = useGetAllUsersProgressQuery();
  const { data: summaryData, isLoading: summaryLoading } = useGetOverallProgressSummaryQuery();
  const [activeTab, setActiveTab] = useState<"projects" | "users">("projects");

  if (projectsLoading || usersLoading || summaryLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  const projects = projectsData || [];
  const users = usersData || [];
  const summary = summaryData || {
    activeProjects: 0,
    pendingTasks: 0,
    completedTasks: 0,
    totalTasks: 0,
    averageProgress: 0,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">📊 Monitoreo de Progreso</h1>
        <p className="text-gray-600">Vista general del avance de proyectos y equipos</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-5 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Proyectos Activos</p>
              <p className="text-3xl font-bold text-gray-800">{summary.activeProjects}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <FolderOpen className="w-7 h-7 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-5 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Tareas Pendientes</p>
              <p className="text-3xl font-bold text-gray-800">{summary.pendingTasks}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <Clock className="w-7 h-7 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-5 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Tareas Completadas</p>
              <p className="text-3xl font-bold text-gray-800">{summary.completedTasks}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-5 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Progreso Promedio</p>
              <p className="text-3xl font-bold text-gray-800">{summary.averageProgress}%</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <TrendingUp className="w-7 h-7 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("projects")}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === "projects"
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          Proyectos
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === "users"
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Users className="w-5 h-5" />
          Usuarios
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {activeTab === "projects" ? (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-blue-600" />
              Progreso por Proyecto
            </h2>

            {projects.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No hay proyectos con tareas</p>
            ) : (
              <div className="space-y-6">
                {projects.map((project) => (
                  <div key={project.id} className="border-b last:border-0 pb-5 last:pb-0">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800 text-lg">{project.name}</h3>
                        <p className="text-sm text-gray-500">
                          {project.completedTasks} de {project.totalTasks} tareas completadas
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          project.percentage >= 75
                            ? "bg-green-100 text-green-700"
                            : project.percentage >= 50
                            ? "bg-yellow-100 text-yellow-700"
                            : project.percentage >= 25
                            ? "bg-orange-100 text-orange-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {project.percentage}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          project.percentage >= 75
                            ? "bg-green-500"
                            : project.percentage >= 50
                            ? "bg-yellow-500"
                            : project.percentage >= 25
                            ? "bg-orange-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${project.percentage}%` }}
                      ></div>
                    </div>

                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>Inicio: {new Date(project.startDate).toLocaleDateString()}</span>
                      {project.endDate && (
                        <span>Fin: {new Date(project.endDate).toLocaleDateString()}</span>
                      )}
                      <span className="font-medium text-gray-700">{project.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              Progreso por Usuario
            </h2>

            {users.length === 0 ? (
              <p className="text-center text-gray-400 py-8">
                No hay usuarios con tareas asignadas
              </p>
            ) : (
              <div className="space-y-6">
                {users.map((user) => (
                  <div key={user.id} className="border-b last:border-0 pb-5 last:pb-0">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800 text-lg">{user.name}</h3>
                        <p className="text-sm text-gray-500">
                          {user.role} • {user.completedTasks} de {user.totalTasks} tareas
                          completadas
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.percentage >= 80
                            ? "bg-green-100 text-green-700"
                            : user.percentage >= 60
                            ? "bg-yellow-100 text-yellow-700"
                            : user.percentage >= 40
                            ? "bg-orange-100 text-orange-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {user.percentage}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          user.percentage >= 80
                            ? "bg-green-500"
                            : user.percentage >= 60
                            ? "bg-yellow-500"
                            : user.percentage >= 40
                            ? "bg-orange-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${user.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressMonitoring;