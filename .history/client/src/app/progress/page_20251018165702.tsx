"use client";

import React, { useState } from "react";
import {
  useGetAllProjectsProgressQuery,
  useGetAllUsersProgressQuery,
  useGetOverallProgressSummaryQuery,
} from "@/state/api";
import { BarChart3, Users, FolderOpen, TrendingUp, CheckCircle2, Clock, Search, Calendar, Target } from "lucide-react";

const ProgressMonitoring = () => {
  const { data: projectsData, isLoading: projectsLoading } = useGetAllProjectsProgressQuery();
  const { data: usersData, isLoading: usersLoading } = useGetAllUsersProgressQuery();
  const { data: summaryData, isLoading: summaryLoading } = useGetOverallProgressSummaryQuery();
  const [activeTab, setActiveTab] = useState<"projects" | "users">("projects");
  const [searchTerm, setSearchTerm] = useState("");

  if (projectsLoading || usersLoading || summaryLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard de progreso...</p>
        </div>
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

  // Filtrar proyectos según el término de búsqueda
  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtrar usuarios según el término de búsqueda
  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header Simple */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Monitoreo de Progreso</h1>
        <p className="text-gray-600">Vista general del avance de proyectos y equipos</p>
      </div>

      {/* Summary Cards en Azul Corporativo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Proyectos culminados</p>
              <p className="text-3xl font-bold text-gray-800">{summary.activeProjects}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-full">
              <FolderOpen className="w-7 h-7 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Tareas Pendientes</p>
              <p className="text-3xl font-bold text-gray-800">{summary.pendingTasks}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-full">
              <Clock className="w-7 h-7 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Tareas Completadas</p>
              <p className="text-3xl font-bold text-gray-800">{summary.completedTasks}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-full">
              <CheckCircle2 className="w-7 h-7 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Progreso Promedio</p>
              <p className="text-3xl font-bold text-gray-800">{summary.averageProgress}%</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-full">
              <TrendingUp className="w-7 h-7 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Panel Principal */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header del Panel en Azul */}
        <div className="bg-blue-600 px-6 py-4 rounded-t-lg">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                {activeTab === "projects" ? (
                  <FolderOpen className="w-6 h-6 text-white" />
                ) : (
                  <Users className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {activeTab === "projects" ? "Progreso por Proyecto" : "Progreso por Usuario"}
                </h2>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* Tabs en Azul */}
              <div className="flex gap-1 bg-white/20 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab("projects")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
                    activeTab === "projects"
                      ? "bg-white text-blue-600"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Proyectos
                </button>
                <button
                  onClick={() => setActiveTab("users")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
                    activeTab === "users"
                      ? "bg-white text-blue-600"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Usuarios
                </button>
              </div>

              {/* Buscador */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className="w-full pl-10 pr-4 py-2 rounded-md bg-white border border-gray-300 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`Buscar ${activeTab === "projects" ? "proyectos..." : "usuarios..."}`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === "projects" ? (
            <div>
              {filteredProjects.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-500 mb-1">
                    {searchTerm ? "No se encontraron proyectos" : "No hay proyectos disponibles"}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {searchTerm ? "Intenta con otros términos de búsqueda" : "Todos los proyectos están completados o no hay tareas asignadas"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProjects.map((project) => (
                    <div key={project.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-800">{project.name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              project.status === 'Completado' ? 'bg-green-100 text-green-800' :
                              project.status === 'En Progreso' ? 'bg-blue-100 text-blue-800' :
                              project.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {project.status}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mb-2">
                            {project.completedTasks} de {project.totalTasks} tareas completadas
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>Inicio: {new Date(project.startDate).toLocaleDateString()}</span>
                            </div>
                            {project.endDate && (
                              <div className="flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                <span>Fin: {new Date(project.endDate).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-xl font-bold ${
                            project.percentage >= 75 ? "text-green-600" :
                            project.percentage >= 50 ? "text-blue-600" :
                            project.percentage >= 25 ? "text-yellow-600" : "text-red-600"
                          }`}>
                            {project.percentage}%
                          </span>
                          <p className="text-xs text-gray-500 mt-1">Completado</p>
                        </div>
                      </div>

                      {/* Progress Bar en Azul */}
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            project.percentage >= 75
                              ? "bg-green-500"
                              : project.percentage >= 50
                              ? "bg-blue-500"
                              : project.percentage >= 25
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${project.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-500 mb-1">
                    {searchTerm ? "No se encontraron usuarios" : "No hay usuarios disponibles"}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {searchTerm ? "Intenta con otros términos de búsqueda" : "No hay usuarios con tareas asignadas"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {user.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-800">{user.name}</h3>
                              <p className="text-blue-600 text-sm">{user.role}</p>
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm">
                            {user.completedTasks} de {user.totalTasks} tareas completadas
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xl font-bold ${
                            user.percentage >= 80 ? "text-green-600" :
                            user.percentage >= 60 ? "text-blue-600" :
                            user.percentage >= 40 ? "text-yellow-600" : "text-red-600"
                          }`}>
                            {user.percentage}%
                          </span>
                          <p className="text-xs text-gray-500 mt-1">Eficiencia</p>
                        </div>
                      </div>

                      {/* Progress Bar en Azul */}
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            user.percentage >= 80
                              ? "bg-green-500"
                              : user.percentage >= 60
                              ? "bg-blue-500"
                              : user.percentage >= 40
                              ? "bg-yellow-500"
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
    </div>
  );
};

export default ProgressMonitoring;