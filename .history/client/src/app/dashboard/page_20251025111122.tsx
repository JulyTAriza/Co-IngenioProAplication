"use client";

import {
  Building2,
  Users,
  Package,
  DollarSign,
  Calendar,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Wrench,
  Activity,
  BarChart3,
  Bell,
} from "lucide-react";
import { 
  useGetProyectosQuery, 
  useGetMaterialsQuery, 
  useGetUsersQuery,
  useGetInventorySummaryQuery,
  useGetOverallProgressSummaryQuery,
} from "@/state/api";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  bgColor: string;
  trend?: {
    value: number;
    label: string;
  };
}

const MetricCard = ({ title, value, subtitle, icon, bgColor, trend }: MetricCardProps) => (
  <div className={`${bgColor} rounded-3xl p-6 text-white relative overflow-hidden`}>
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium opacity-90">{title}</span>
        <div className="bg-white bg-opacity-20 rounded-full p-2">
          {icon}
        </div>
      </div>
      
      <div className="mb-2">
        <div className="text-4xl font-bold mb-1">{value}</div>
        <div className="text-sm opacity-90">{subtitle}</div>
      </div>

      {trend && (
        <div className="flex items-center gap-2 mt-4">
          <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-xs font-medium">
            {trend.value > 0 ? '+' : ''}{trend.value}%
          </span>
          <span className="text-xs opacity-75">{trend.label}</span>
        </div>
      )}
    </div>
    
    {/* Decorative background pattern */}
    <div className="absolute right-0 bottom-0 w-32 h-32 opacity-10">
      <div className="absolute inset-0 rounded-full border-8 border-white transform translate-x-8 translate-y-8"></div>
    </div>
  </div>
);

interface StatsCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  bgGradient: string;
  iconBgColor: string;
}

const StatsCard = ({ icon, title, value, subtitle, bgGradient, iconBgColor }: StatsCardProps) => (
  <div className={`${bgGradient} rounded-3xl p-6 text-white relative overflow-hidden shadow-lg`}>
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-4">
        <div className={`${iconBgColor} rounded-2xl p-3 backdrop-blur-sm`}>
          {icon}
        </div>
        <h3 className="font-bold text-lg">{title}</h3>
      </div>
      
      <div className="mb-2">
        <div className="text-4xl font-bold mb-1">{value}</div>
        <p className="text-sm opacity-90">{subtitle}</p>
      </div>

      {/* Mini chart decoration */}
      <div className="mt-4 h-16 relative opacity-50">
        <svg className="w-full h-full" viewBox="0 0 200 50" preserveAspectRatio="none">
          <path
            d="M 0 40 L 20 35 L 40 38 L 60 30 L 80 32 L 100 25 L 120 28 L 140 20 L 160 23 L 180 18 L 200 20"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>

    {/* Decorative circle */}
    <div className="absolute -right-8 -top-8 w-32 h-32 bg-white opacity-10 rounded-full"></div>
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-white/50 rounded-xl w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-48 bg-white/50 rounded-3xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calcular estadísticas de proyectos
  const proyectosActivos = proyectos.filter(p => p.estado === 'En planificación' || p.estado === 'En progreso').length;
  const proyectosCompletados = proyectos.filter(p => p.estado === 'Completado').length;
  const totalProyectos = proyectos.length;
  
  // Estadísticas de inventario
  const materialesStockBajo = inventorySummary?.lowStockCount || 0;
  
  // Estadísticas de usuarios
  const usuariosActivos = users.filter(u => u.username !== 'admin').length;

  // Estadísticas de progreso
  const tareasCompletadas = progressSummary?.completedTasks || 0;
  const tareasPendientes = progressSummary?.pendingTasks || 0;

  const currentDate = new Date().toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Dashboard</h1>
          <p className="text-gray-600">Resumen general de Co-Ingenio • {currentDate}</p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          
          {/* Large Overview Card */}
          <div className="md:col-span-2 xl:col-span-2 bg-gradient-to-br from-purple-500 to-purple-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Resumen General</h2>
                  <p className="text-purple-200 text-sm">Estadísticas principales del sistema</p>
                </div>
                <select className="bg-white bg-opacity-20 text-white rounded-xl px-4 py-2 text-sm font-medium border-0 outline-none cursor-pointer">
                  <option>Mensual</option>
                  <option>Semanal</option>
                  <option>Anual</option>
                </select>
              </div>

              {/* Chart */}
              <div className="mb-8 h-32 relative">
                <svg className="w-full h-full" viewBox="0 0 400 100">
                  <path
                    d="M 0 80 Q 50 60, 100 70 T 200 60 T 300 50 T 400 40"
                    fill="none"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="2"
                  />
                  <path
                    d="M 0 80 Q 50 60, 100 70 T 200 60 T 300 50 T 400 40"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <circle cx="200" cy="60" r="6" fill="#fff" />
                  <circle cx="200" cy="60" r="10" fill="rgba(255,255,255,0.3)" />
                </svg>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="text-3xl font-bold mb-1">{totalProyectos}</div>
                  <div className="text-purple-200 text-sm">Total Proyectos</div>
                </div>
                <div>
                  <div className="text-3xl font-bold mb-1">{proyectosActivos}</div>
                  <div className="text-purple-200 text-sm">En Progreso</div>
                </div>
                <div>
                  <div className="text-3xl font-bold mb-1">{proyectosCompletados}</div>
                  <div className="text-purple-200 text-sm">Completados</div>
                </div>
              </div>
            </div>

            <div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32"></div>
          </div>

          {/* Tareas Card */}
          <MetricCard
            title="Tareas Activas"
            value={tareasPendientes.toString()}
            subtitle={`${tareasCompletadas} completadas`}
            icon={<CheckCircle className="w-6 h-6" />}
            bgColor="bg-gradient-to-br from-pink-400 to-pink-600"
          />

          {/* Materiales Card */}
          <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-3xl p-6 text-white relative overflow-hidden shadow-lg">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium opacity-90">Inventario</span>
                <div className="bg-white bg-opacity-20 rounded-full p-2">
                  <Package className="w-6 h-6" />
                </div>
              </div>
              
              <div className="mb-2">
                <div className="text-4xl font-bold mb-1">{materials.length}</div>
                <div className="text-sm opacity-90">Materiales totales</div>
              </div>

              {materialesStockBajo > 0 && (
                <div className="flex items-center gap-2 mt-4">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs opacity-90">{materialesStockBajo} items con stock bajo</span>
                </div>
              )}
            </div>
            
            <div className="absolute right-0 bottom-0 w-32 h-32 opacity-10">
              <div className="absolute inset-0 rounded-full border-8 border-white transform translate-x-8 translate-y-8"></div>
            </div>
          </div>

          {/* Stats Cards Row */}
          <StatsCard
            icon={<Building2 className="w-6 h-6" />}
            title="Gestión de Proyectos"
            value={proyectosActivos.toString()}
            subtitle={`${proyectosCompletados} proyectos completados`}
            bgGradient="bg-gradient-to-br from-pink-500 to-rose-500"
            iconBgColor="bg-white/20"
          />

          <StatsCard
            icon={<Wrench className="w-6 h-6" />}
            title="Control de Materiales"
            value={materials.length.toString()}
            subtitle="Materiales en sistema"
            bgGradient="bg-gradient-to-br from-blue-500 to-blue-600"
            iconBgColor="bg-white/20"
          />

          <StatsCard
            icon={<Users className="w-6 h-6" />}
            title="Equipo de Trabajo"
            value={users.length.toString()}
            subtitle={`${usuariosActivos} usuarios activos`}
            bgGradient="bg-gradient-to-br from-cyan-500 to-cyan-600"
            iconBgColor="bg-white/20"
          />

          <StatsCard
            icon={<Activity className="w-6 h-6" />}
            title="Estado General"
            value={totalProyectos.toString()}
            subtitle="Proyectos en sistema"
            bgGradient="bg-gradient-to-br from-orange-500 to-orange-600"
            iconBgColor="bg-white/20"
          />

          {/* Recent Projects Section - Bubble Style */}
          <div className="md:col-span-2 xl:col-span-4 bg-white rounded-3xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-1">Actividades Recientes</h3>
                <p className="text-sm text-gray-600">Últimas actualizaciones de proyectos</p>
              </div>
              <button className="text-purple-600 font-medium text-sm hover:text-purple-700 transition-colors">
                Ver todos →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {proyectos.slice(0, 4).map((proyecto, index) => {
                const gradients = [
                  'from-pink-400 to-rose-500',
                  'from-purple-400 to-purple-600',
                  'from-blue-400 to-blue-600',
                  'from-orange-400 to-orange-600'
                ];
                const gradient = gradients[index % gradients.length];

                const getStatusColor = (estado: string) => {
                  switch (estado) {
                    case 'En planificación': return 'bg-blue-100 text-blue-700';
                    case 'En progreso': return 'bg-yellow-100 text-yellow-700';
                    case 'Completado': return 'bg-green-100 text-green-700';
                    default: return 'bg-gray-100 text-gray-700';
                  }
                };

                return (
                  <div key={proyecto.id_proyecto} className={`bg-gradient-to-br ${gradient} rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="bg-white bg-opacity-20 rounded-2xl p-3 backdrop-blur-sm">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(proyecto.estado)} bg-white`}>
                        {proyecto.estado}
                      </span>
                    </div>
                    
                    <h4 className="font-bold text-lg mb-2 line-clamp-1">{proyecto.nombre}</h4>
                    <p className="text-sm opacity-90 mb-1">
                      {new Date(proyecto.fecha_inicio).toLocaleDateString('es-ES')}
                    </p>
                    <p className="text-xs opacity-75">
                      Cliente: {proyecto.nombre_cliente}
                    </p>

                    {/* Mini decorative chart */}
                    <div className="mt-4 h-8 opacity-30">
                      <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                        <path
                          d="M 0 20 L 25 15 L 50 18 L 75 10 L 100 12"
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;