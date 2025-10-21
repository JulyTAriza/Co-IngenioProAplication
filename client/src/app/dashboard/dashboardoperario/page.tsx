"use client";

import {
  CheckSquare,
  Clock,
  TrendingUp,
  AlertCircle,
  Calendar,
  CheckCircle2,
  PlayCircle,
  Target,
  BarChart3,
  Users,
} from "lucide-react";
import { 
  useGetMyTasksListQuery,
  useGetOverallProgressSummaryQuery,
  useGetAllProjectsProgressQuery 
} from "@/state/api";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard = ({ title, value, subtitle, icon, color, trend }: StatCardProps) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUp className={`w-4 h-4 ${!trend.isPositive ? 'rotate-180' : ''}`} />
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

const TaskCard = ({ task }: { task: any }) => {
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completado':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'en progreso':
        return <PlayCircle className="w-5 h-5 text-blue-500" />;
      case 'pendiente':
        return <Clock className="w-5 h-5 text-orange-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completado':
        return 'border-l-green-500';
      case 'en progreso':
        return 'border-l-blue-500';
      case 'pendiente':
        return 'border-l-orange-500';
      default:
        return 'border-l-gray-500';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow border-l-4 ${getStatusColor(task.status)} p-4`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          {getStatusIcon(task.status)}
          <h4 className="font-semibold text-gray-800">{task.name}</h4>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${
          task.status.toLowerCase() === 'completado' 
            ? 'bg-green-100 text-green-800'
            : task.status.toLowerCase() === 'en progreso'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-orange-100 text-orange-800'
        }`}>
          {task.status}
        </span>
      </div>
      
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {task.description || 'Sin descripción'}
      </p>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Inicio: {new Date(task.startDate).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            <span>Fin: {new Date(task.endDate).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium text-gray-700">{task.project}</div>
          <div className="text-gray-500">Etapa: {task.stage}</div>
        </div>
      </div>
    </div>
  );
};

const ProjectProgressCard = () => {
  const { data: projectsProgress = [], isLoading } = useGetAllProjectsProgressQuery();

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

  const activeProjects = projectsProgress.filter(p => 
    p.status.toLowerCase() === 'en progreso' || p.status.toLowerCase() === 'en planificación'
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="text-blue-600 w-6 h-6" />
        <h3 className="font-semibold text-gray-800">Progreso de Proyectos</h3>
      </div>

      <div className="space-y-4">
        {activeProjects.slice(0, 3).map((project) => (
          <div key={project.id} className="border-l-4 border-blue-500 pl-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-800">{project.name}</h4>
              <span className="text-sm font-semibold text-blue-600">
                {project.percentage}%
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${project.percentage}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                {project.completedTasks} de {project.totalTasks} tareas
              </span>
              <span>
                {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {activeProjects.length === 0 && (
        <div className="text-center text-gray-500 py-4">
          <p>No hay proyectos activos</p>
        </div>
      )}
    </div>
  );
};

const RecentTasksCard = () => {
  const { data: tasksData, isLoading } = useGetMyTasksListQuery();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const allTasks = [...(tasksData?.pending || []), ...(tasksData?.completed || [])];
  const recentTasks = allTasks
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .slice(0, 5);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-6">
        <CheckSquare className="text-blue-600 w-6 h-6" />
        <h3 className="font-semibold text-gray-800">Mis Tareas Recientes</h3>
      </div>

      <div className="space-y-4">
        {recentTasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>

      {recentTasks.length === 0 && (
        <div className="text-center text-gray-500 py-4">
          <p>No tienes tareas asignadas</p>
        </div>
      )}
    </div>
  );
};

const DashboardOperario = () => {
  const { data: tasksData, isLoading: tasksLoading } = useGetMyTasksListQuery();
  const { data: progressSummary, isLoading: summaryLoading } = useGetOverallProgressSummaryQuery();

  const pendingTasks = tasksData?.pending?.length || 0;
  const completedTasks = tasksData?.completed?.length || 0;
  const totalTasks = pendingTasks + completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (tasksLoading || summaryLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Mi Dashboard</h1>
        <p className="text-gray-600">Resumen de mis tareas y progreso</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Tareas Pendientes"
          value={pendingTasks}
          subtitle="Por completar"
          icon={<Clock className="w-6 h-6 text-orange-600" />}
          color="bg-orange-50"
        />
        
        <StatCard
          title="Tareas Completadas"
          value={completedTasks}
          subtitle="Finalizadas"
          icon={<CheckCircle2 className="w-6 h-6 text-green-600" />}
          color="bg-green-50"
        />
        
        <StatCard
          title="Tasa de Completación"
          value={`${completionRate}%`}
          subtitle="Eficiencia"
          icon={<TrendingUp className="w-6 h-6 text-blue-600" />}
          color="bg-blue-50"
        />
        
        <StatCard
          title="Proyectos Activos"
          value={progressSummary?.activeProjects || 0}
          subtitle="En progreso"
          icon={<Users className="w-6 h-6 text-purple-600" />}
          color="bg-purple-50"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tareas Recientes */}
        <div className="lg:col-span-1">
          <RecentTasksCard />
        </div>

        {/* Progreso de Proyectos */}
        <div className="lg:col-span-1">
          <ProjectProgressCard />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium">Ver Todas mis Tareas</span>
          </button>
          <button className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium">Mi Progreso</span>
          </button>
          <button className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium">Mi Calendario</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardOperario;
