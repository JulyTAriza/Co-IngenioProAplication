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
    proyecto: 60, // porcentaje
    estado: 20,   // porcentaje
    fecha: 20,    // porcentaje
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
        const newProyectoWidth = Math.max(30, Math.min(80, percentage));
        const remainingWidth = 100 - newProyectoWidth;
        const estadoWidth = (columnWidths.estado / (columnWidths.estado + columnWidths.fecha)) * remainingWidth;
        const fechaWidth = remainingWidth - estadoWidth;

        setColumnWidths({
          proyecto: newProyectoWidth,
          estado: estadoWidth,
          fecha: fechaWidth,
        });
      } else if (isResizing === 'estado') {
        const proyectoWidth = columnWidths.proyecto;
        const newEstadoWidth = Math.max(10, Math.min(40, percentage - proyectoWidth));
        const fechaWidth = 100 - proyectoWidth - newEstadoWidth;

        setColumnWidths({
          proyecto: proyectoWidth,
          estado: newEstadoWidth,
          fecha: Math.max(10, fechaWidth),
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

        {/* ... (el resto del código permanece igual hasta la tabla) ... */}

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
                gridTemplateColumns: `${columnWidths.proyecto}% ${columnWidths.estado}% ${columnWidths.fecha}%` 
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
                    gridTemplateColumns: `${columnWidths.proyecto}% ${columnWidths.estado}% ${columnWidths.fecha}%` 
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

          {/* Estado General - Donut Chart (este código permanece igual) */}
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