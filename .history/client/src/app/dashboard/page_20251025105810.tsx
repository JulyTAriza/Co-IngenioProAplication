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
} from "lucide-react";
import { 
  useGetProyectosQuery, 
  useGetMaterialsQuery, 
  useGetUsersQuery 
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

interface ActivityCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  progress: number;
  bgColor: string;
  iconBgColor: string;
  progressColor: string;
  badge?: string;
}

const ActivityCard = ({ icon, title, subtitle, progress, bgColor, iconBgColor, progressColor, badge }: ActivityCardProps) => (
  <div className={`${bgColor} rounded-3xl p-6 relative overflow-hidden`}>
    <div className="relative z-10">
      <div className={`${iconBgColor} rounded-2xl w-14 h-14 flex items-center justify-center mb-4`}>
        {icon}
      </div>
      
      <h3 className="font-bold text-gray-800 mb-1">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{subtitle}</p>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 font-medium">Progreso</span>
          <span className="font-bold text-gray-800">{progress}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`${progressColor} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {badge && (
          <div className="mt-3">
            <span className="bg-white border border-gray-200 px-3 py-1 rounded-full text-xs font-medium text-gray-700">
              {badge}
            </span>
          </div>
        )}
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { data: proyectos = [], isLoading: loadingProyectos } = useGetProyectosQuery({});
  const { data: materials = [], isLoading: loadingMaterials } = useGetMaterialsQuery();
  const { data: users = [], isLoading: loadingUsers } = useGetUsersQuery();

  if (loadingProyectos || loadingMaterials || loadingUsers) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-white/50 rounded-xl w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-48 bg-white/50 rounded-3xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calcular estadísticas
  const proyectosActivos = proyectos.filter(p => p.estado === 'En planificación' || p.estado === 'En progreso').length;
  const proyectosCompletados = proyectos.filter(p => p.estado === 'Completado').length;
  const totalProyectos = proyectos.length;
  const presupuestoTotal = proyectos.reduce((sum, p) => sum + (p.presupuesto || 0), 0);
  
  const materialesStockBajo = materials.filter(m => m.cantidad < 10).length;
  const valorTotalStock = materials.reduce((sum, m) => sum + ((m.cantidad || 0) * (m.precio_unitario || 0)), 0);
  
  const usuariosActivos = users.filter(u => u.username !== 'admin').length;

  // Calcular progreso de proyectos
  const progresoProyectos = totalProyectos > 0 ? Math.round((proyectosCompletados / totalProyectos) * 100) : 0;
  const progresoMateriales = materials.length > 0 ? Math.round(((materials.length - materialesStockBajo) / materials.length) * 100) : 0;

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Dashboard</h1>
              <p className="text-gray-600">Resumen general de Co-Ingenio • {currentDate}</p>
            </div>
            <div className="bg-white rounded-2xl px-6 py-3 shadow-sm">
              <div className="text-sm text-gray-600">Vista</div>
              <div className="text-lg font-bold text-purple-600">General</div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {/* Large Overview Card */}
          <div className="md:col-span-2 bg-gradient-to-br from-purple-500 to-purple-700 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Resumen General</h2>
                  <p className="text-purple-200 text-sm">Estadísticas principales</p>
                </div>
                <select className="bg-white bg-opacity-20 text-white rounded-xl px-4 py-2 text-sm font-medium border-0 outline-none">
                  <option>Mensual</option>
                  <option>Semanal</option>
                  <option>Anual</option>
                </select>
              </div>

              {/* Chart placeholder - you can integrate recharts here */}
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
                  {/* Dot indicator */}
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

            {/* Decorative elements */}
            <div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32"></div>
          </div>

          {/* Daily Activity Card */}
          <MetricCard
            title="Presupuesto Total"
            value={`$${(presupuestoTotal / 1000).toFixed(0)}K`}
            subtitle="Inversión total"
            icon={<DollarSign className="w-6 h-6" />}
            bgColor="bg-gradient-to-br from-pink-400 to-pink-600"
            trend={{ value: 12, label: "vs mes anterior" }}
          />

          {/* Activity Cards Row */}
          <ActivityCard
            icon={<Building2 className="w-7 h-7 text-purple-600" />}
            title="Gestión de Proyectos"
            subtitle={`${proyectosActivos} proyectos activos`}
            progress={progresoProyectos}
            bgColor="bg-white"
            iconBgColor="bg-purple-100"
            progressColor="bg-gradient-to-r from-purple-500 to-purple-600"
            badge={`${proyectosCompletados} completados`}
          />

          <ActivityCard
            icon={<Wrench className="w-7 h-7 text-blue-600" />}
            title="Control de Materiales"
            subtitle={`${materials.length} materiales en stock`}
            progress={progresoMateriales}
            bgColor="bg-white"
            iconBgColor="bg-blue-100"
            progressColor="bg-gradient-to-r from-blue-500 to-blue-600"
            badge={materialesStockBajo > 0 ? `${materialesStockBajo} stock bajo` : "Stock óptimo"}
          />

          <ActivityCard
            icon={<Users className="w-7 h-7 text-green-600" />}
            title="Equipo de Trabajo"
            subtitle={`${users.length} usuarios registrados`}
            progress={Math.round((usuariosActivos / users.length) * 100)}
            bgColor="bg-white"
            iconBgColor="bg-green-100"
            progressColor="bg-gradient-to-r from-green-500 to-green-600"
            badge={`${usuariosActivos} activos`}
          />

          {/* Recent Projects Section */}
          <div className="md:col-span-2 xl:col-span-3 bg-white rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-1">Proyectos Recientes</h3>
                <p className="text-sm text-gray-600">Últimas actualizaciones</p>
              </div>
              <button className="text-purple-600 font-medium text-sm hover:text-purple-700">
                Ver todos →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {proyectos.slice(0, 3).map((proyecto) => {
                const getStatusColor = (estado: string) => {
                  switch (estado) {
                    case 'En planificación': return 'bg-blue-100 text-blue-700';
                    case 'En progreso': return 'bg-yellow-100 text-yellow-700';
                    case 'Completado': return 'bg-green-100 text-green-700';
                    default: return 'bg-gray-100 text-gray-700';
                  }
                };

                return (
                  <div key={proyecto.id_proyecto} className="border border-gray-200 rounded-2xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="bg-purple-100 rounded-xl p-2">
                        <Building2 className="w-5 h-5 text-purple-600" />
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(proyecto.estado)}`}>
                        {proyecto.estado}
                      </span>
                    </div>
                    
                    <h4 className="font-bold text-gray-800 mb-2 line-clamp-1">{proyecto.nombre}</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      {new Date(proyecto.fecha_inicio).toLocaleDateString('es-ES')}
                    </p>
                    
                    {proyecto.presupuesto && (
                      <div className="text-lg font-bold text-green-600">
                        ${proyecto.presupuesto.toLocaleString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white bg-opacity-20 rounded-2xl p-3">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg">Valor de Stock</h3>
            </div>
            
            <div className="text-4xl font-bold mb-2">
              ${(valorTotalStock / 1000).toFixed(1)}K
            </div>
            <p className="text-blue-100 text-sm mb-4">Valor total en inventario</p>
            
            <div className="bg-white bg-opacity-20 rounded-xl p-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Materiales registrados</span>
                <span className="font-bold">{materials.length}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;