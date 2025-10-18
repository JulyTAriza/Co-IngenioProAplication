"use client"; 

import React, { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Calendar, Edit2, Trash2, X, Save, User, FolderOpen } from 'lucide-react';
import { 
  useGetGanttProyectoQuery,
  useCreateActividadMutation,
  useUpdateActividadMutation,
  useDeleteActividadMutation,
  useGetUsersQuery,
  useGetProyectosQuery,
  ActividadPayload,
  Actividad
} from '@/state/api';

type EstadoType = "Completada" | "En Progreso" | "Pendiente" | "Cancelada";

const ESTADO_COLORS: Record<EstadoType, { bg: string; light: string; ring: string }> = {
  "Completada": { bg: "bg-green-500", light: "bg-green-100 text-green-700", ring: "ring-green-500" },
  "En Progreso": { bg: "bg-blue-500", light: "bg-blue-100 text-blue-700", ring: "ring-blue-500" },
  "Pendiente": { bg: "bg-gray-400", light: "bg-gray-100 text-gray-600", ring: "ring-gray-400" },
  "Cancelada": { bg: "bg-red-500", light: "bg-red-100 text-red-700", ring: "ring-red-500" }
};

function getEstadoColor(estado: string): { bg: string; light: string; ring: string } {
  return ESTADO_COLORS[estado as EstadoType] || ESTADO_COLORS["Pendiente"];
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function calcularPosicionBarra(fechaInicio: string, fechaFin: string, yearMonth: { year: number, month: number }) {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const primeroMes = new Date(yearMonth.year, yearMonth.month, 1);
  const ultimoMes = new Date(yearMonth.year, yearMonth.month + 1, 0);
  
  const daysInMonth = getDaysInMonth(yearMonth.year, yearMonth.month);
  const dayStart = inicio < primeroMes ? 1 : inicio.getDate();
  const dayEnd = fin > ultimoMes ? daysInMonth : fin.getDate();
  
  const left = ((dayStart - 1) / daysInMonth) * 100;
  const width = ((dayEnd - dayStart + 1) / daysInMonth) * 100;
  
  return { left: `${Math.max(0, left)}%`, width: `${Math.min(100 - left, width)}%` };
}

interface ModalActividadProps {
  isOpen: boolean;
  onClose: () => void;
  onActividadCreada?: () => void; // ⭐⭐⭐ NUEVA PROP ⭐⭐⭐
  idEtapa: number;
  actividadEdit?: Actividad | null;
}

function ModalActividad({ isOpen, onClose, onActividadCreada, idEtapa, actividadEdit }: ModalActividadProps) {
  const [formData, setFormData] = useState<ActividadPayload>({
    nombre: actividadEdit?.nombre || '',
    descripcion: actividadEdit?.descripcion || '',
    fecha_inicio: actividadEdit?.fecha_inicio || new Date().toISOString().split('T')[0],
    fecha_fin: actividadEdit?.fecha_fin || new Date().toISOString().split('T')[0],
    estado: actividadEdit?.estado || 'Pendiente',
    id_personal: actividadEdit?.id_personal || undefined
  });

  const [createActividad, { isLoading: isCreating }] = useCreateActividadMutation();
  const [updateActividad, { isLoading: isUpdating }] = useUpdateActividadMutation();
  const { data: usuarios } = useGetUsersQuery();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (actividadEdit) {
        await updateActividad({ 
          id_actividad: actividadEdit.id_actividad, 
          data: formData 
        }).unwrap();
        alert('Actividad actualizada correctamente');
      } else {
        await createActividad({ 
          id_etapa: idEtapa, 
          data: formData 
        }).unwrap();
        alert('Actividad creada correctamente');
      }
      onClose();
      // ⭐⭐⭐ LLAMAR AL CALLBACK DESPUÉS DE CREAR/ACTUALIZAR ⭐⭐⭐
      if (onActividadCreada) {
        onActividadCreada();
      }
    } catch (error: any) {
      alert(`Error: ${error?.data?.message || 'Error al guardar'}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 m-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            {actividadEdit ? 'Editar Actividad' : 'Nueva Actividad'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la actividad *
            </label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ej: Desarrollo de API REST"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              rows={3}
              placeholder="Detalles adicionales..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de inicio *
              </label>
              <input
                type="date"
                required
                value={formData.fecha_inicio}
                onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de fin *
              </label>
              <input
                type="date"
                required
                value={formData.fecha_fin}
                onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado *
              </label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Pendiente">Pendiente</option>
                <option value="En Progreso">En Progreso</option>
                <option value="Completada">Completada</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Responsable
              </label>
              <select
                value={formData.id_personal || ''}
                onChange={(e) => setFormData({ ...formData, id_personal: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Sin asignar</option>
                {usuarios?.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreating || isUpdating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={18} />
              {isCreating || isUpdating ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CronogramaGantt() {
  const [selectedProyectoId, setSelectedProyectoId] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState({ year: 2025, month: 9 });
  const [expandedEtapas, setExpandedEtapas] = useState<number[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEtapa, setSelectedEtapa] = useState<number | null>(null);
  const [editingActividad, setEditingActividad] = useState<Actividad | null>(null);

  // Obtener lista de proyectos
  const { data: proyectos, isLoading: isLoadingProyectos } = useGetProyectosQuery({});
  
  // ⭐⭐⭐ OBTENER refetch DEL HOOK ⭐⭐⭐
  const { 
    data: ganttData, 
    isLoading: isLoadingGantt, 
    error,
    refetch  // ← AGREGAR ESTO
  } = useGetGanttProyectoQuery(
    selectedProyectoId || 0, 
    { skip: !selectedProyectoId }
  );

  const [deleteActividad] = useDeleteActividadMutation();
  const [updateActividad] = useUpdateActividadMutation();

  const daysInMonth = getDaysInMonth(currentDate.year, currentDate.month);
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const toggleEtapa = (id: number) => {
    setExpandedEtapas(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const changeMonth = (delta: number) => {
    setCurrentDate(prev => {
      let newMonth = prev.month + delta;
      let newYear = prev.year;
      
      if (newMonth > 11) {
        newMonth = 0;
        newYear++;
      } else if (newMonth < 0) {
        newMonth = 11;
        newYear--;
      }
      
      return { year: newYear, month: newMonth };
    });
  };

  const handleOpenModal = (idEtapa: number, actividad?: Actividad) => {
    setSelectedEtapa(idEtapa);
    setEditingActividad(actividad || null);
    setModalOpen(true);
  };

  // ⭐⭐⭐ MODIFICAR handleCloseModal ⭐⭐⭐
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedEtapa(null);
    setEditingActividad(null);
  };

  // ⭐⭐⭐ NUEVA FUNCIÓN PARA REFRESCAR DATOS ⭐⭐⭐
  const handleRefetchData = () => {
    if (selectedProyectoId) {
      refetch();
    }
  };

  const handleDeleteActividad = async (idActividad: number) => {
    if (confirm('¿Estás seguro de eliminar esta actividad?')) {
      try {
        await deleteActividad(idActividad).unwrap();
        alert('Actividad eliminada correctamente');
        // ⭐⭐⭐ REFRESCAR DESPUÉS DE ELIMINAR ⭐⭐⭐
        handleRefetchData();
      } catch (error: any) {
        alert(`Error: ${error?.data?.message || 'Error al eliminar'}`);
      }
    }
  };

  const handleToggleComplete = async (actividad: Actividad) => {
    const nuevoEstado = actividad.estado === 'Completada' ? 'En Progreso' : 'Completada';
    try {
      await updateActividad({
        id_actividad: actividad.id_actividad,
        data: { ...actividad, estado: nuevoEstado }
      }).unwrap();
      // ⭐⭐⭐ REFRESCAR DESPUÉS DE CAMBIAR ESTADO ⭐⭐⭐
      handleRefetchData();
    } catch (error: any) {
      alert(`Error: ${error?.data?.message || 'Error al actualizar'}`);
    }
  };

  // Estado de carga de proyectos
  if (isLoadingProyectos) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando proyectos...</p>
        </div>
      </div>
    );
  }

  // Si no hay proyectos
  if (!proyectos || proyectos.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
          <h3 className="text-yellow-800 font-bold mb-2">No hay proyectos</h3>
          <p className="text-yellow-600">
            No se encontraron proyectos. Crea algunos proyectos primero para ver sus cronogramas.
          </p>
        </div>
      </div>
    );
  }

  // Si no se ha seleccionado un proyecto
  if (!selectedProyectoId) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <FolderOpen className="text-blue-600" size={28} />
              <h1 className="text-2xl font-bold text-gray-800">Seleccionar Proyecto</h1>
            </div>
            
            <p className="text-gray-600 mb-6">
              Selecciona un proyecto para ver su cronograma en el diagrama de Gantt
            </p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {proyectos.map((proyecto) => (
                <button
                  key={proyecto.id_proyecto}
                  onClick={() => setSelectedProyectoId(proyecto.id_proyecto)}
                  className="p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition text-left"
                >
                  <h3 className="font-semibold text-gray-800 mb-2">{proyecto.nombre}</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {proyecto.descripcion || 'Sin descripción'}
                  </p>
                  <div className="text-xs text-gray-500">
                    <div>Cliente: {proyecto.nombre_cliente}</div>
                    <div>Inicio: {proyecto.fecha_inicio}</div>
                    {proyecto.fecha_fin && <div>Fin: {proyecto.fecha_fin}</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Encontrar el proyecto seleccionado para mostrar su nombre
  const proyectoSeleccionado = proyectos.find(p => p.id_proyecto === selectedProyectoId);

  // Estado de carga del cronograma
  if (isLoadingGantt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando cronograma...</p>
        </div>
      </div>
    );
  }

  // Error al cargar el cronograma
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-red-800 font-bold mb-2">Error al cargar cronograma</h3>
          <p className="text-red-600">No se pudo cargar el cronograma del proyecto seleccionado.</p>
          <button
            onClick={() => setSelectedProyectoId(null)}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
          >
            Volver a selección
          </button>
        </div>
      </div>
    );
  }

  // Vista principal del cronograma
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg">
        {/* HEADER */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="text-blue-600" size={28} />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Cronograma del Proyecto</h1>
                <p className="text-gray-600">
                  {proyectoSeleccionado?.nombre} 
                  <button
                    onClick={() => setSelectedProyectoId(null)}
                    className="ml-4 text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Cambiar proyecto
                  </button>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => changeMonth(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="px-4 py-2 font-semibold text-lg">
                {monthNames[currentDate.month]} {currentDate.year}
              </span>
              <button 
                onClick={() => changeMonth(1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* GANTT CHART */}
        <div className="overflow-x-auto">
          {/* Header de días */}
          <div className="grid border-b bg-gray-50" style={{ gridTemplateColumns: '320px 1fr' }}>
            <div className="px-4 py-3 font-semibold text-gray-700 border-r sticky left-0 bg-gray-50 z-10">
              Tareas
            </div>
            <div className="grid" style={{ gridTemplateColumns: `repeat(${daysInMonth}, 1fr)` }}>
              {Array.from({ length: daysInMonth }, (_, i) => {
                const date = new Date(currentDate.year, currentDate.month, i + 1);
                const dayName = dayNames[date.getDay()];
                const isToday = new Date().toDateString() === date.toDateString();
                
                return (
                  <div 
                    key={i}
                    className={`text-center py-2 border-r text-xs ${isToday ? 'bg-blue-100' : ''}`}
                  >
                    <div className={`font-semibold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                      {i + 1}
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase">{dayName}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filas de tareas */}
          <div className="divide-y">
            {ganttData?.map((etapa) => (
              <div key={etapa.id_etapa}>
                {/* FILA DE ETAPA */}
                <div className="grid hover:bg-gray-50 transition" style={{ gridTemplateColumns: '320px 1fr' }}>
                  <div className="px-4 py-4 border-r flex items-center gap-2 sticky left-0 bg-white z-10">
                    <button 
                      onClick={() => toggleEtapa(etapa.id_etapa)}
                      className="text-gray-500 hover:text-gray-700 font-bold"
                    >
                      {expandedEtapas.includes(etapa.id_etapa) ? '▼' : '▶'}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-800 truncate">{etapa.nombre}</div>
                      <div className="text-xs text-gray-500">
                        {etapa.fecha_inicio} - {etapa.fecha_fin}
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenModal(etapa.id_etapa)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Agregar actividad"
                    >
                      <Plus size={18} />
                    </button>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getEstadoColor(etapa.estado).light}`}>
                      {etapa.estado}
                    </span>
                  </div>
                  <div className="relative py-4 px-2">
                    <div 
                      className={`absolute top-1/2 -translate-y-1/2 h-8 rounded-lg ${getEstadoColor(etapa.estado).bg} opacity-30`}
                      style={calcularPosicionBarra(etapa.fecha_inicio, etapa.fecha_fin, currentDate)}
                    />
                  </div>
                </div>

                {/* FILAS DE ACTIVIDADES */}
                {expandedEtapas.includes(etapa.id_etapa) && etapa.actividades?.map((actividad) => (
                  <div 
                    key={actividad.id_actividad}
                    className="grid hover:bg-blue-50 transition group" 
                    style={{ gridTemplateColumns: '320px 1fr' }}
                  >
                    <div className="px-4 py-3 pl-10 border-r flex items-center gap-3 sticky left-0 bg-white z-10">
                      <input 
                        type="checkbox" 
                        checked={actividad.estado === "Completada"} 
                        onChange={() => handleToggleComplete(actividad)}
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-800 truncate">{actividad.nombre}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <User size={12} />
                          {actividad.personal || 'Sin asignar'}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => handleOpenModal(etapa.id_etapa, actividad)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteActividad(actividad.id_actividad)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs ${getEstadoColor(actividad.estado).light}`}>
                        {actividad.estado.slice(0, 3)}
                      </span>
                    </div>
                    <div className="relative py-3 px-2">
                      <div 
                        className={`absolute top-1/2 -translate-y-1/2 h-6 rounded shadow-sm ${getEstadoColor(actividad.estado).bg} cursor-pointer hover:shadow-md transition-all hover:ring-2 ${getEstadoColor(actividad.estado).ring}`}
                        style={calcularPosicionBarra(actividad.fecha_inicio, actividad.fecha_fin, currentDate)}
                        onClick={() => handleOpenModal(etapa.id_etapa, actividad)}
                        title={`${actividad.nombre}\n${actividad.fecha_inicio} - ${actividad.fecha_fin}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* LEYENDA */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center gap-6 text-sm">
            <span className="font-semibold text-gray-600">Estados:</span>
            {Object.entries(ESTADO_COLORS).map(([estado, colors]) => (
              <div key={estado} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${colors.bg}`} />
                <span className="text-gray-600">{estado}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {selectedEtapa && (
        <ModalActividad
          isOpen={modalOpen}
          onClose={handleCloseModal}
          onActividadCreada={handleRefetchData} // ⭐⭐⭐ PASAR EL CALLBACK ⭐⭐⭐
          idEtapa={selectedEtapa}
          actividadEdit={editingActividad}
        />
      )}
    </div>
  );
}