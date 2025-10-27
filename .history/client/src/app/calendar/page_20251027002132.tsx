// src/app/calendar/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { 
  useGetMyTasksListQuery 
} from "@/state/api";;

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  project: string;
  stage: string;
  status: string;
  type: 'pending' | 'completed';
}

export default function CalendarPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  
  const { data: myTasks, isLoading, error } = useGetMyTasksListQuery();

  // Combinar todas las tareas
  const allTasks = useMemo(() => {
    if (!myTasks) return [];
    return [...myTasks.pending, ...myTasks.completed];
  }, [myTasks]);

  // Obtener días de la semana actual
  const weekDays = useMemo(() => {
    const start = new Date(currentWeek);
    start.setDate(start.getDate() - start.getDay()); // Domingo
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentWeek]);

  // Transformar tasks a eventos del calendario
  const calendarEvents = useMemo((): CalendarEvent[] => {
    return allTasks.map(task => ({
      id: `task_${task.id}`,
      title: task.name,
      start: new Date(task.startDate),
      end: new Date(task.endDate),
      project: task.project,
      stage: task.stage,
      status: task.status,
      type: myTasks?.completed.some(t => t.id === task.id) ? 'completed' : 'pending'
    }));
  }, [allTasks, myTasks]);

  // Filtrar eventos por estado
  const filteredEvents = useMemo(() => {
    if (filterStatus === 'all') return calendarEvents;
    return calendarEvents.filter(event => event.type === filterStatus);
  }, [calendarEvents, filterStatus]);

  // Navegación de semanas
  const goToPreviousWeek = () => {
    setCurrentWeek(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  };

  const goToNextWeek = () => {
    setCurrentWeek(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  // Obtener eventos para un día específico
  const getEventsForDay = (day: Date) => {
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === day.toDateString();
    });
  };

  const getStatusColor = (status: string, type: 'pending' | 'completed') => {
    if (type === 'completed') return 'bg-green-500';
    
    switch (status) {
      case 'En Progreso': return 'bg-blue-500';
      case 'Pendiente': return 'bg-yellow-500';
      case 'Atrasado': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (type: 'pending' | 'completed') => {
    return type === 'completed' ? 'Completado' : 'Pendiente';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">Cargando tareas...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-red-500 text-center py-8">
            Error cargando las tareas
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">
                Mis Tareas
              </span>
            </div>
          </div>

          {/* Controles */}
          <div className="flex justify-between items-center bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-4">
              {/* Navegación */}
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPreviousWeek}
                  className="p-2 hover:bg-gray-100 rounded-md"
                >
                  ←
                </button>
                <button
                  onClick={goToToday}
                  className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Hoy
                </button>
                <button
                  onClick={goToNextWeek}
                  className="p-2 hover:bg-gray-100 rounded-md"
                >
                  →
                </button>
              </div>

              {/* Semana actual */}
              <span className="text-lg font-semibold">
                {weekDays[0].toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })} - Semana {Math.ceil(weekDays[0].getDate() / 7)}
              </span>
            </div>

            {/* Filtros de estado */}
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'Todas', color: 'gray' },
                { value: 'pending', label: 'Pendientes', color: 'yellow' },
                { value: 'completed', label: 'Completadas', color: 'green' }
              ].map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => setFilterStatus(value as any)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    filterStatus === value
                      ? `bg-${color}-100 text-${color}-800 border border-${color}-300`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendario Semanal */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Encabezado de días */}
          <div className="grid grid-cols-8 border-b border-gray-200">
            <div className="p-4 border-r border-gray-200 bg-gray-50 font-semibold">
              Hora / Día
            </div>
            {weekDays.map((day, index) => (
              <div key={index} className="p-4 text-center border-r border-gray-200 last:border-r-0 bg-gray-50">
                <div className="font-semibold">
                  {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                </div>
                <div className="text-2xl font-bold text-gray-700">
                  {day.getDate()}
                </div>
                <div className="text-sm text-gray-500">
                  {day.toLocaleDateString('es-ES', { month: 'short' })}
                </div>
              </div>
            ))}
          </div>

          {/* Horas del día */}
          <div className="divide-y divide-gray-200">
            {Array.from({ length: 12 }, (_, hour) => {
              const currentHour = hour + 8; // Desde las 8:00 AM
              return (
                <div key={hour} className="grid grid-cols-8">
                  {/* Hora */}
                  <div className="p-3 border-r border-gray-200 bg-gray-50 text-right text-sm text-gray-500">
                    {currentHour}:00
                  </div>
                  
                  {/* Celdas de cada día */}
                  {weekDays.map((day, dayIndex) => {
                    const dayEvents = getEventsForDay(day).filter(event => {
                      const eventHour = new Date(event.start).getHours();
                      return eventHour === currentHour;
                    });

                    return (
                      <div 
                        key={dayIndex} 
                        className="p-1 border-r border-gray-200 last:border-r-0 min-h-[80px] relative"
                      >
                        {dayEvents.map((event, eventIndex) => (
                          <div
                            key={eventIndex}
                            className={`p-2 mb-1 rounded-md text-white text-xs cursor-pointer ${
                              getStatusColor(event.status, event.type)
                            }`}
                            title={`${event.title} - ${event.project} - ${getStatusText(event.type)}`}
                          >
                            <div className="font-semibold truncate">
                              {event.title}
                            </div>
                            <div className="truncate opacity-90">
                              {event.project}
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-xs">
                                {new Date(event.start).toLocaleTimeString('es-ES', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                              <span className="text-xs bg-black bg-opacity-20 px-1 rounded">
                                {getStatusText(event.type)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumen */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">Total Tareas</div>
            <div className="text-2xl font-bold text-gray-800">{allTasks.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">Pendientes</div>
            <div className="text-2xl font-bold text-yellow-600">{myTasks?.pending.length || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">Completadas</div>
            <div className="text-2xl font-bold text-green-600">{myTasks?.completed.length || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">Esta Semana</div>
            <div className="text-2xl font-bold text-blue-600">
              {filteredEvents.filter(event => 
                event.start >= weekDays[0] && event.start <= weekDays[6]
              ).length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}