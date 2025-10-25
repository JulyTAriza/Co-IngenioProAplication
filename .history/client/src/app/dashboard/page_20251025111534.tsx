"use client";

import {
  Building2,
  Users,
  Package,
  CheckCircle,
  Wrench,
  Activity,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { 
  useGetProyectosQuery, 
  useGetMaterialsQuery, 
  useGetUsersQuery,
  useGetInventorySummaryQuery,
  useGetOverallProgressSummaryQuery,
} from "@/state/api";

interface SmallCardProps {
  title: string;
  value: string;
  bgColor: string;
  textColor: string;
}

const SmallCard = ({ title, value, bgColor, textColor }: SmallCardProps) => (
  <div className={`${bgColor} rounded-2xl p-4 shadow-sm`}>
    <div className={`text-sm ${textColor} opacity-75 mb-1`}>{title}</div>
    <div className={`text-3xl font-bold ${textColor}`}>{value}</div>
  </div>
);

interface LargeMetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  bgGradient: string;
}

const LargeMetricCard = ({ title, value, subtitle, icon, bgGradient }: LargeMetricCardProps) => (
  <div className={`${bgGradient} rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all`}>
    <div className="flex items-center gap-3 mb-4">
      <div className="bg-white bg-opacity-20 rounded-xl p-2.5">
        {icon}
      </div>
      <h3 className="font-semibold text-sm opacity-90">{title}</h3>
    </div>
    
    <div className="text-4xl font-bold mb-1">{value}</div>
    <p className="text-sm opacity-80">{subtitle}</p>

    {/* Mini chart */}
    <div className="mt-6 h-10 opacity-40">
      <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none">
        <path
          d="M 0 30 Q 20 25 40 28 T 80 20 T 120 22 T 160 15 T 200 18"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  </div>
);

const Dashboard = () => {
  const { data: proyectos = [], isLoading: loadingProyectos } = useGetProyectosQuery({});
  const { data: materials = [], isLoading: loadingMaterials } = useGetMaterialsQuery();
  const { data: users = [], isLoading: loadingUsers } = useGetUsersQuery();
  const { data: inventorySummary, isLoading: loadingInventory } = useGetInventorySummaryQuery();
  const { data: progressSummary, isLoading: loadingProgress } = useGetOverallProgressSummaryQuery();

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

  const proyectosActivos = proyectos.filter(p => p.estado === 'En planificación' || p.estado === 'En progreso').length;
  const proyectosCompletados = proyectos.filter(p => p.estado === 'Completado').length;
  const totalProyectos = proyectos.length;
  const materialesStockBajo = inventorySummary?.lowStockCount || 0;
  const usuariosActivos = users.filter(u => u.username !== 'admin').length;
  const tareasCompletadas = progressSummary?.completedTasks || 0;
  const tareasPendientes = progressSummary?.pendingTasks || 0;
  const totalTareas = progressSummary?.totalTasks || 1;
  const valorTotalStock = inventorySummary?.totalValue || 0;

  const currentDate = new Date().toLocaleDateString('es-ES', { 
    weekday: 'long',
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Dashboard</h1>
          <p className="text-gray-500 text-sm capitalize">{currentDate}</p>
        </div>

        {/* Main Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
          
          {/* Total Revenue Card */}
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
                {proyectosCompletados}
              </span>
              <span className="text-gray-500">completados</span>
            </div>
          </div>

          {/* Current Month Sales */}
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

          {/* Today Sales */}
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

          {/* Total Earning */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Valor Stock</p>
                <h2 className="text-3xl font-bold text-gray-800">${(valorTotalStock / 1000).toFixed(1)}K</h2>
              </div>
              <div className="bg-orange-100 rounded-full p-3">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {materialesStockBajo > 0 ? (
                <>
                  <span className="flex items-center text-orange-600 font-medium">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    {materialesStockBajo}
                  </span>
                  <span className="text-gray-500">stock bajo</span>
                </>
              ) : (
                <span className="text-green-600 font-medium">Stock óptimo</span>
              )}
            </div>
          </div>

        </div>

        {/* Revenue Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
          
          <LargeMetricCard
            title="Revenue Status"
            value={proyectosActivos.toString()}
            subtitle={`${proyectosCompletados} proyectos completados`}
            icon={<Building2 className="w-5 h-5" />}
            bgGradient="bg-gradient-to-br from-pink-500 to-pink-600"
          />

          <LargeMetricCard
            title="Page View"
            value={materials.length.toString()}
            subtitle="Materiales en sistema"
            icon={<Wrench className="w-5 h-5" />}
            bgGradient="bg-gradient-to-br from-purple-500 to-purple-600"
          />

          <LargeMetricCard
            title="Number Rate"
            value={users.length.toString()}
            subtitle={`${usuariosActivos} usuarios activos`}
            icon={<Users className="w-5 h-5" />}
            bgGradient="bg-gradient-to-br from-cyan-500 to-blue-500"
          />

          <LargeMetricCard
            title="Bounce Status"
            value={totalProyectos.toString()}
            subtitle="Proyectos en sistema"
            icon={<Activity className="w-5 h-5" />}
            bgGradient="bg-gradient-to-br from-orange-500 to-orange-600"
          />

        </div>

        {/* Recent Activities / Order Status */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Recent Activities */}
          <div className="xl:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800">Actividades Recientes</h3>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">Ver todas</button>
            </div>
            
            <div className="space-y-4">
              {proyectos.slice(0, 5).map((proyecto) => {
                const getStatusColor = (estado: string) => {
                  switch (estado) {
                    case 'En planificación': return 'bg-blue-100 text-blue-700';
                    case 'En progreso': return 'bg-yellow-100 text-yellow-700';
                    case 'Completado': return 'bg-green-100 text-green-700';
                    default: return 'bg-gray-100 text-gray-700';
                  }
                };

                return (
                  <div key={proyecto.id_proyecto} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 rounded-lg p-2">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm">{proyecto.nombre}</h4>
                        <p className="text-xs text-gray-500">{proyecto.nombre_cliente}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(proyecto.estado)}`}>
                        {proyecto.estado}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(proyecto.fecha_inicio).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Status / Traffic */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Estado General</h3>
            
            {/* Donut Chart Placeholder */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="20"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="#8B5CF6"
                    strokeWidth="20"
                    strokeDasharray={`${(proyectosCompletados / totalProyectos) * 440} 440`}
                    strokeLinecap="round"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="20"
                    strokeDasharray={`${(proyectosActivos / totalProyectos) * 440} 440`}
                    strokeDashoffset={`-${(proyectosCompletados / totalProyectos) * 440}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">{totalProyectos}</div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-sm text-gray-600">Completados</span>
                </div>
                <span className="font-bold text-gray-800">
                  {totalProyectos > 0 ? Math.round((proyectosCompletados / totalProyectos) * 100) : 0}%
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-gray-600">En Progreso</span>
                </div>
                <span className="font-bold text-gray-800">
                  {totalProyectos > 0 ? Math.round((proyectosActivos / totalProyectos) * 100) : 0}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                  <span className="text-sm text-gray-600">Planificación</span>
                </div>
                <span className="font-bold text-gray-800">
                  {totalProyectos > 0 ? Math.round(((totalProyectos - proyectosActivos - proyectosCompletados) / totalProyectos) * 100) : 0}%
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