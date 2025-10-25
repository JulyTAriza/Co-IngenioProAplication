"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Building2,
  Users,
  Package,
  CheckCircle,
  Wrench,
  Activity,
  TrendingUp,
  AlertTriangle,
  Calendar,
  GripVertical,
} from "lucide-react";
import { 
  useGetProyectosQuery, 
  useGetMaterialsQuery, 
  useGetUsersQuery,
  useGetInventorySummaryQuery,
  useGetOverallProgressSummaryQuery,
} from "@/state/api";

interface ColumnWidths {
  proyecto: number;
  cliente: number;
  estado: number;
  fecha: number;
}

const Dashboard = () => {
  const { data: proyectos = [], isLoading: loadingProyectos } = useGetProyectosQuery({});
  const { data: materials = [], isLoading: loadingMaterials } = useGetMaterialsQuery();
  const { data: users = [], isLoading: loadingUsers } = useGetUsersQuery();
  const { data: inventorySummary, isLoading: loadingInventory } = useGetInventorySummaryQuery();
  const { data: progressSummary, isLoading: loadingProgress } = useGetOverallProgressSummaryQuery();

  // Estado para los anchos de las columnas
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>({
    proyecto: 50, // porcentaje
    cliente: 25,  // porcentaje
    estado: 15,   // porcentaje
    fecha: 10,    // porcentaje
  });

  const [isResizing, setIsResizing] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Efecto para manejar el redimensionamiento
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !tableRef.current) return;

      const tableRect = tableRef.current.getBoundingClientRect();
      const tableWidth = tableRect.width;
      const mouseX = e.clientX - tableRect.left;
      const percentage = (mouseX / tableWidth) * 100;

      if (isResizing === 'proyecto') {
        const newProyectoWidth = Math.max(30, Math.min(70, percentage));
        const remainingWidth = 100 - newProyectoWidth;
        const clienteWidth = (columnWidths.cliente / (columnWidths.cliente + columnWidths.estado + columnWidths.fecha)) * remainingWidth;
        const estadoWidth = (columnWidths.estado / (columnWidths.cliente + columnWidths.estado + columnWidths.fecha)) * remainingWidth;
        const fechaWidth = remainingWidth - clienteWidth - estadoWidth;

        setColumnWidths({
          proyecto: newProyectoWidth,
          cliente: Math.max(15, clienteWidth),
          estado: Math.max(10, estadoWidth),
          fecha: Math.max(8, fechaWidth),
        });
      } else if (isResizing === 'cliente') {
        const proyectoWidth = columnWidths.proyecto;
        const newClienteWidth = Math.max(15, Math.min(40, percentage - proyectoWidth));
        const remainingWidth = 100 - proyectoWidth - newClienteWidth;
        const estadoWidth = (columnWidths.estado / (columnWidths.estado + columnWidths.fecha)) * remainingWidth;
        const fechaWidth = remainingWidth - estadoWidth;

        setColumnWidths({
          proyecto: proyectoWidth,
          cliente: newClienteWidth,
          estado: Math.max(10, estadoWidth),
          fecha: Math.max(8, fechaWidth),
        });
      } else if (isResizing === 'estado') {
        const proyectoWidth = columnWidths.proyecto;
        const clienteWidth = columnWidths.cliente;
        const newEstadoWidth = Math.max(10, Math.min(30, percentage - proyectoWidth - clienteWidth));
        const fechaWidth = 100 - proyectoWidth - clienteWidth - newEstadoWidth;

        setColumnWidths({
          proyecto: proyectoWidth,
          cliente: clienteWidth,
          estado: newEstadoWidth,
          fecha: Math.max(8, fechaWidth),
        });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, columnWidths]);

  if (loadingProyectos || loadingMaterials || loadingUsers || loadingInventory || loadingProgress) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="h-40 bg-gray-200 rounded-3xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CORREGIDO: Usar los estados correctos de la base de datos
  const proyectosFinalizados = proyectos.filter(p => p.estado === 'finalizada').length;
  const proyectosEnProgreso = proyectos.filter(p => p.estado === 'En progreso').length;
  const proyectosPlanificacion = proyectos.filter(p => p.estado === 'En planificación').length;
  
  const totalProyectos = proyectos.length;
  const materialesStockBajo = inventorySummary?.lowStockCount || 0;
  const usuariosActivos = users.filter(u => u.username !== 'admin').length;
  const tareasCompletadas = progressSummary?.completedTasks || 0;
  const totalTareas = progressSummary?.totalTasks || 1;

  const currentDate = new Date().toLocaleDateString('es-ES', { 
    weekday: 'long',
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });

  // CORREGIDO: Calcular porcentajes correctamente
  const porcentajeFinalizados = totalProyectos > 0 ? Math.round((proyectosFinalizados / totalProyectos) * 100) : 0;
  const porcentajeEnProgreso = totalProyectos > 0 ? Math.round((proyectosEnProgreso / totalProyectos) * 100) : 0;
  const porcentajePlanificacion = totalProyectos > 0 ? Math.round((proyectosPlanificacion / totalProyectos) * 100) : 0;

  // Función para colores de estado
  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'En planificación': return 'bg-blue-100 text-blue-700';
      case 'En progreso': return 'bg-yellow-100 text-yellow-700';
      case 'finalizada': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Dashboard</h1>
          <p className="text-gray-500 text-sm capitalize">{currentDate}</p>
        </div>

        {/* Main Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          
          {/* Total Proyectos */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Proyectos</p>
                <h2 className="text-3xl font-bold text-gray-800">{totalProyectos}</h2>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="flex items-center text-green-600 font-medium">
                <TrendingUp className="w-4 h-4 mr-1" />
                {proyectosFinalizados}
              </span>
              <span className="text-gray-500">completados</span>
            </div>
          </div>

          {/* Tareas Totales */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Tareas Totales</p>
                <h2 className="text-3xl font-bold text-gray-800">{totalTareas}</h2>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="flex items-center text-blue-600 font-medium">
                {Math.round((tareasCompletadas / totalTareas) * 100)}%
              </span>
              <span className="text-gray-500">completado</span>
            </div>
          </div>

          {/* Usuarios */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Usuarios</p>
                <h2 className="text-3xl font-bold text-gray-800">{users.length}</h2>
              </div>
              <div className="bg-cyan-100 rounded-full p-3">
                <Users className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-cyan-600 font-medium">{usuariosActivos}</span>
              <span className="text-gray-500">activos</span>
            </div>
          </div>

        </div>

        {/* Revenue Status Cards with Gradients */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
          
          {/* Card 1 - Pink Gradient */}
          <div className="bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600 rounded-3xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white bg-opacity-20 rounded-xl p-2.5 backdrop-blur-sm">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm">Gestión Proyectos</h3>
            </div>
            
            <div className="text-4xl font-bold mb-1">{proyectosEnProgreso + proyectosPlanificacion}</div>
            <p className="text-sm opacity-90">{proyectosFinalizados} completados</p>

            <div className="mt-6 h-10 opacity-40">
              <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none">
                <path d="M 0 30 Q 20 25 40 28 T 80 20 T 120 22 T 160 15 T 200 18" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Card 2 - Purple Gradient */}
          <div className="bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white bg-opacity-20 rounded-xl p-2.5 backdrop-blur-sm">
                <Wrench className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm">Control Materiales</h3>
            </div>
            
            <div className="text-4xl font-bold mb-1">{materials.length}</div>
            <p className="text-sm opacity-90">materiales registrados</p>

            <div className="mt-6 h-10 opacity-40">
              <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none">
                <path d="M 0 25 Q 25 30 50 22 T 100 28 T 150 20 T 200 25" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Card 3 - Blue Gradient */}
          <div className="bg-gradient-to-br from-blue-400 via-blue-500 to-cyan-500 rounded-3xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white bg-opacity-20 rounded-xl p-2.5 backdrop-blur-sm">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm">Equipo Trabajo</h3>
            </div>
            
            <div className="text-4xl font-bold mb-1">{users.length}</div>
            <p className="text-sm opacity-90">{usuariosActivos} usuarios activos</p>

            <div className="mt-6 h-10 opacity-40">
              <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none">
                <path d="M 0 28 Q 30 20 60 25 T 120 18 T 180 22 T 200 20" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Card 4 - Orange Gradient */}
          <div className="bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded-3xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white bg-opacity-20 rounded-xl p-2.5 backdrop-blur-sm">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm">Estado General</h3>
            </div>
            
            <div className="text-4xl font-bold mb-1">{totalProyectos}</div>
            <p className="text-sm opacity-90">proyectos en sistema</p>

            <div className="mt-6 h-10 opacity-40">
              <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none">
                <path d="M 0 32 Q 25 28 50 30 T 100 24 T 150 28 T 200 22" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

        </div>

        {/* Bottom Section - Table Style */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Recent Activities - Table Style con columnas redimensionables */}
          <div className="xl:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Actividades Recientes</h3>
            </div>
            
            {/* Table Header */}
            <div 
              ref={tableRef}
              className="grid gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-600 uppercase select-none"
              style={{ 
                gridTemplateColumns: `${columnWidths.proyecto}% ${columnWidths.cliente}% ${columnWidths.estado}% ${columnWidths.fecha}%` 
              }}
            >
              <div className="flex items-center gap-2">
                <span>Proyecto</span>
                <div
                  className="w-2 cursor-col-resize opacity-30 hover:opacity-100 transition-opacity"
                  onMouseDown={() => setIsResizing('proyecto')}
                >
                  <GripVertical className="w-3 h-3" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span>Estado</span>
                <div
                  className="w-2 cursor-col-resize opacity-30 hover:opacity-100 transition-opacity"
                  onMouseDown={() => setIsResizing('estado')}
                >
                  <GripVertical className="w-3 h-3" />
                </div>
              </div>
              
              <div className="text-right">
                Fecha
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-100">
              {proyectos.slice(0, 6).map((proyecto) => (
                <div 
                  key={proyecto.id_proyecto} 
                  className="grid gap-4 px-6 py-4 hover:bg-gray-50 transition-colors items-center"
                  style={{ 
                    gridTemplateColumns: `${columnWidths.proyecto}% ${columnWidths.cliente}% ${columnWidths.estado}% ${columnWidths.fecha}%` 
                  }}
                >
                  {/* Columna Proyecto */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-blue-100 rounded-lg p-2 flex-shrink-0">
                      <Building2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <span 
                      className="font-medium text-gray-800 text-sm truncate"
                      title={proyecto.nombre}
                    >
                      {proyecto.nombre}
                    </span>
                  </div>

                  {/* Columna Estado */}
                  <div className="min-w-0">
                    <span 
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(proyecto.estado)} inline-block truncate max-w-full`}
                      title={proyecto.estado}
                    >
                      {proyecto.estado}
                    </span>
                  </div>

                  {/* Columna Fecha */}
                  <div className="text-right text-sm text-gray-500 min-w-0">
                    {new Date(proyecto.fecha_inicio).toLocaleDateString('es-ES', { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Mensaje cuando no hay proyectos */}
            {proyectos.length === 0 && (
              <div className="text-center py-8">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-500 mb-1">
                  No hay proyectos disponibles
                </h3>
                <p className="text-gray-400 text-sm">
                  Comienza creando tu primer proyecto
                </p>
              </div>
            )}
          </div>

          {/* Estado General - Donut Chart */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Estado General</h3>
            
            {/* Donut Chart */}
            <div className="flex items-center justify-center mb-6 p-4">
              <div className="relative" style={{ width: '200px', height: '200px' }}>
                <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#F3F4F6"
                    strokeWidth="24"
                  />
                  
                  {/* Finalizados - Green */}
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="24"
                    strokeDasharray={`${(proyectosFinalizados / totalProyectos) * 502.4} 502.4`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                  
                  {/* En Progreso - Yellow */}
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="24"
                    strokeDasharray={`${(proyectosEnProgreso / totalProyectos) * 502.4} 502.4`}
                    strokeDashoffset={`-${(proyectosFinalizados / totalProyectos) * 502.4}`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />

                  {/* Planificación - Blue */}
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="24"
                    strokeDasharray={`${(proyectosPlanificacion / totalProyectos) * 502.4} 502.4`}
                    strokeDashoffset={`-${((proyectosFinalizados + proyectosEnProgreso) / totalProyectos) * 502.4}`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                
                {/* Center text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-gray-800">{totalProyectos}</div>
                    <div className="text-xs text-gray-500 mt-1">Total</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium text-gray-700">Finalizados</span>
                </div>
                <span className="font-bold text-gray-800">
                  {porcentajeFinalizados}%
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm font-medium text-gray-700">En Progreso</span>
                </div>
                <span className="font-bold text-gray-800">
                  {porcentajeEnProgreso}%
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm font-medium text-gray-700">Planificación</span>
                </div>
                <span className="font-bold text-gray-800">
                  {porcentajePlanificacion}%
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Dashboard;