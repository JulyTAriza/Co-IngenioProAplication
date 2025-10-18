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
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando dashboard de progreso...</p>
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

  // Calcular métricas adicionales
  const completionRate = summary.totalTasks > 0 
    ? Math.round((summary.completedTasks / summary.totalTasks) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 p-6">
      {/* Header Mejorado */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-lg border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <div className="text-left">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Monitoreo de Progreso
            </h1>
            <p className="text-gray-600 text-lg mt-1">Vista general del avance de proyectos y equipos</p>
          </div>
        </div>
      </div>

      {/* Summary Cards Mejoradas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 transform hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">Proyectos Activos</p>
              <p className="text-4xl font-bold text-gray-800">{summary.activeProjects}</p>
              <p className="text-sm text-green-600 font-medium mt-2">
                +2% desde la semana pasada
              </p>
            </div>
            <div className="bg-blue-500/10 p-4 rounded-2xl">
              <FolderOpen className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 transform hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">Tareas Pendientes</p>
              <p className="text-4xl font-bold text-gray-800">{summary.pendingTasks}</p>
              <p className="text-sm text-yellow-600 font-medium mt-2">
                {Math.round((summary.pendingTasks / summary.totalTasks) * 100)}% del total
              </p>
            </div>
            <div className="bg-yellow-500/10 p-4 rounded-2xl">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 transform hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">Tareas Completadas</p>
              <p className="text-4xl font-bold text-gray-800">{summary.completedTasks}</p>
              <p className="text-sm text-green-600 font-medium mt-2">
                {completionRate}% de efectividad
              </p>
            </div>
            <div className="bg-green-500/10 p-4 rounded-2xl">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 transform hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">Progreso Promedio</p>
              <p className="text-4xl font-bold text-gray-800">{summary.averageProgress}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div 
                  className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${summary.averageProgress}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-purple-500/10 p-4 rounded-2xl">
              <Target className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Panel Principal */}
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header del Panel */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                {activeTab === "projects" ? (
                  <FolderOpen className="w-8 h-8 text-white" />
                ) : (
                  <Users className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {activeTab === "projects" ? "Progreso por Proyecto" : "Progreso por Usuario"}
                </h2>
                <p className="text-blue-100">
                  {activeTab === "projects" 
                    ? `Mostrando ${filteredProjects.length} de ${projects.length} proyectos`
                    : `Mostrando ${filteredUsers.length} de ${users.length} usuarios`
                  }
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* Tabs Mejorados */}
              <div className="flex gap-2 bg-white/20 backdrop-blur-sm rounded-2xl p-1">
                <button
                  onClick={() => setActiveTab("projects")}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                    activeTab === "projects"
                      ? "bg-white text-blue-600 shadow-lg"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                  Proyectos
                </button>
                <button
                  onClick={() => setActiveTab("users")}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                    activeTab === "users"
                      ? "bg-white text-blue-600 shadow-lg"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  <Users className="w-5 h-5" />
                  Usuarios
                </button>
              </div>

              {/* Buscador Mejorado */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/90 backdrop-blur-sm border border-white/20 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
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
                <div className="text-center py-12">
                  <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-500 mb-2">
                    {searchTerm ? "No se encontraron proyectos" : "No hay proyectos disponibles"}
                  </h3>
                  <p className="text-gray-400">
                    {searchTerm ? "Intenta con otros términos de búsqueda" : "Todos los proyectos están completados o no hay tareas asignadas"}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredProjects.map((project) => (
                    <div key={project.id} className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-800">{project.name}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              project.status === 'Completado' ? 'bg-green-100 text-green-800' :
                              project.status === 'En Progreso' ? 'bg-blue-100 text-blue-800' :
                              project.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {project.status}
                            </span>
                          </div>
                          <p className="text-gray-600 mb-2">
                            {project.completedTasks} de {project.totalTasks} tareas completadas
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>Inicio: {new Date(project.startDate).toLocaleDateString()}</span>
                            </div>
                            {project.endDate && (
                              <div className="flex items-center gap-1">
                                <Target className="w-4 h-4" />
                                <span>Fin: {new Date(project.endDate).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-2xl font-bold ${
                            project.percentage >= 75 ? "text-green-600" :
                            project.percentage >= 50 ? "text-yellow-600" :
                            project.percentage >= 25 ? "text-orange-600" : "text-red-600"
                          }`}>
                            {project.percentage}%
                          </span>
                          <p className="text-sm text-gray-500 mt-1">Completado</p>
                        </div>
                      </div>

                      {/* Progress Bar Mejorado */}
                      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${
                            project.percentage >= 75
                              ? "bg-gradient-to-r from-green-400 to-green-600"
                              : project.percentage >= 50
                              ? "bg-gradient-to-r from-yellow-400 to-yellow-600"
                              : project.percentage >= 25
                              ? "bg-gradient-to-r from-orange-400 to-orange-600"
                              : "bg-gradient-to-r from-red-400 to-red-600"
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
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-500 mb-2">
                    {searchTerm ? "No se encontraron usuarios" : "No hay usuarios disponibles"}
                  </h3>
                  <p className="text-gray-400">
                    {searchTerm ? "Intenta con otros términos de búsqueda" : "No hay usuarios con tareas asignadas"}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-lg">
                                {user.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-800">{user.name}</h3>
                              <p className="text-purple-600 font-medium">{user.role}</p>
                            </div>
                          </div>
                          <p className="text-gray-600">
                            {user.completedTasks} de {user.totalTasks} tareas completadas
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-2xl font-bold ${
                            user.percentage >= 80 ? "text-green-600" :
                            user.percentage >= 60 ? "text-yellow-600" :
                            user.percentage >= 40 ? "text-orange-600" : "text-red-600"
                          }`}>
                            {user.percentage}%
                          </span>
                          <p className="text-sm text-gray-500 mt-1">Eficiencia</p>
                        </div>
                      </div>

                      {/* Progress Bar Mejorado */}
                      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${
                            user.percentage >= 80
                              ? "bg-gradient-to-r from-green-400 to-green-600"
                              : user.percentage >= 60
                              ? "bg-gradient-to-r from-yellow-400 to-yellow-600"
                              : user.percentage >= 40
                              ? "bg-gradient-to-r from-orange-400 to-orange-600"
                              : "bg-gradient-to-r from-red-400 to-red-600"
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