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
} from "lucide-react";
import { 
  useGetProyectosQuery, 
  useGetMaterialsQuery, 
  useGetUsersQuery 
} from "@/state/api";

interface StatCardProps {
  title: string;
  primaryIcon: React.ReactNode;
  dateRange?: string;
  details: Array<{
    title: string;
    amount: string;
    changePercentage?: number;
    IconComponent: React.ComponentType<any>;
    color?: string;
  }>;
}

const StatCard = ({ title, primaryIcon, dateRange, details }: StatCardProps) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {primaryIcon}
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      {dateRange && (
        <span className="text-sm text-gray-500">{dateRange}</span>
      )}
    </div>
    
    <div className="space-y-4">
      {details.map((detail, index) => (
        <div key={index} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${detail.color || 'bg-blue-50'}`}>
              <detail.IconComponent className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-gray-600">{detail.title}</span>
          </div>
          <div className="text-right">
            <div className="font-semibold text-gray-800">{detail.amount}</div>
            {detail.changePercentage !== undefined && (
              <div className={`text-sm flex items-center gap-1 ${
                detail.changePercentage >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {detail.changePercentage >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(detail.changePercentage)}%
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ProjectSummaryCard = () => {
  const { data: proyectos = [], isLoading, isError } = useGetProyectosQuery({});

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-red-500">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p>Error al cargar proyectos</p>
        </div>
      </div>
    );
  }

  // Calcular estadísticas de proyectos
  const proyectosActivos = proyectos.filter(p => p.estado === 'En planificación' || p.estado === 'En progreso').length;
  const proyectosCompletados = proyectos.filter(p => p.estado === 'Completado').length;
  const presupuestoTotal = proyectos.reduce((sum, p) => sum + (p.presupuesto || 0), 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-6">
        <Building2 className="text-blue-600 w-6 h-6" />
        <h3 className="font-semibold text-gray-800">Resumen de Proyectos</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{proyectos.length}</div>
          <div className="text-sm text-gray-600">Total Proyectos</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{proyectosActivos}</div>
          <div className="text-sm text-gray-600">Activos</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Completados</span>
          <span className="font-semibold">{proyectosCompletados}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Presupuesto Total</span>
          <span className="font-semibold">${presupuestoTotal.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

const MaterialsStatusCard = () => {
  const { data: materials = [], isLoading, isError } = useGetMaterialsQuery();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-red-500">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p>Error al cargar materiales</p>
        </div>
      </div>
    );
  }

  // Calcular estadísticas de materiales
  const materialesTotal = materials.length;
  const materialesStockBajo = materials.filter(m => m.cantidad < 10).length;
  const valorTotalStock = materials.reduce((sum, m) => sum + ((m.cantidad || 0) * (m.precio_unitario || 0)), 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-6">
        <Package className="text-blue-600 w-6 h-6" />
        <h3 className="font-semibold text-gray-800">Estado de Materiales</h3>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-50">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-gray-600">Total Materiales</span>
          </div>
          <span className="font-semibold">{materialesTotal}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-orange-50">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
            </div>
            <span className="text-gray-600">Stock Bajo</span>
          </div>
          <span className="font-semibold text-orange-600">{materialesStockBajo}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-50">
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-gray-600">Valor Total</span>
          </div>
          <span className="font-semibold">${valorTotalStock.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

const RecentProjectsCard = () => {
  const { data: proyectos = [], isLoading } = useGetProyectosQuery({});

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Obtener los 3 proyectos más recientes
  const proyectosRecientes = [...proyectos]
    .sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime())
    .slice(0, 3);

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'En planificación': return 'bg-blue-100 text-blue-800';
      case 'En progreso': return 'bg-yellow-100 text-yellow-800';
      case 'Completado': return 'bg-green-100 text-green-800';
      case 'Eliminado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="text-blue-600 w-6 h-6" />
        <h3 className="font-semibold text-gray-800">Proyectos Recientes</h3>
      </div>
      
      <div className="space-y-4">
        {proyectosRecientes.map((proyecto) => (
          <div key={proyecto.id_proyecto} className="border-l-4 border-blue-500 pl-4">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium text-gray-800">{proyecto.nombre}</h4>
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(proyecto.estado)}`}>
                {proyecto.estado}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Inicio: {new Date(proyecto.fecha_inicio).toLocaleDateString()}
            </div>
            {proyecto.presupuesto && (
              <div className="text-sm font-medium text-green-600">
                ${proyecto.presupuesto.toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { data: users = [] } = useGetUsersQuery();
  const currentDate = new Date().toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
        <p className="text-gray-600">Aquí encontrarás el resumen de Co-Ingenio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Resumen de Proyectos */}
        <ProjectSummaryCard />

        {/* Estado de Materiales */}
        <MaterialsStatusCard />

        {/* Estadísticas de Equipo */}
        <StatCard
          title="Gestión de Equipo"
          primaryIcon={<Users className="text-blue-600 w-6 h-6" />}
          dateRange={currentDate}
          details={[
            {
              title: "Total Usuarios",
              amount: users.length.toString(),
              IconComponent: Users,
              color: "bg-blue-50"
            },
            {
              title: "Usuarios Activos",
              amount: users.filter(u => u.username !== 'admin').length.toString(),
              IconComponent: CheckCircle,
              color: "bg-green-50"
            },
          ]}
        />

        {/* Proyectos Recientes - Ocupa 2 columnas en escritorio */}
        <div className="md:col-span-2 xl:col-span-3">
          <RecentProjectsCard />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;