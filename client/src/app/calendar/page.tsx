// src/app/calendar/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { 
  useGetMyTasksListQuery 
} from "@/state/api";

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
    if (type === 'completed') return 'bg-emerald-500 hover:bg-emerald-600';
    
    switch (status) {
      case 'En Progreso': return 'bg-blue-500 hover:bg-blue-600';
      case 'Pendiente': return 'bg-amber-500 hover:bg-amber-600';
      case 'Atrasado': return 'bg-rose-500 hover:bg-rose-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const isToday = (day: Date) => {
    const today = new Date();
    return day.toDateString() === today.toDateString();
  };

  const monthYear = weekDays[0].toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const weekNumber = Math.ceil(weekDays[0].getDate() / 7);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">Cargando tareas...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-red-500 text-center py-8">
            Error cargando las tareas
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header con título mejorado */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-3 rounded-2xl shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Calendario</h1>
                <p className="text-sm text-gray-600 mt-1">Gestiona tus tareas y proyectos</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{new Date().getDate()}</div>
                <div className="text-xs text-gray-500 uppercase">
                  {new Date().toLocaleDateString('es-ES', { month: 'short' })}
                </div>
              </div>
            </div>
          </div>

          {/* Controles de navegación */}
          <div className="bg-white rounded-2xl shadow-lg p-5 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              
              {/* Navegación de semanas */}
              <div className="flex items-center gap-3">
                <button
                  onClick={goToPreviousWeek}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <button
                  onClick={goToToday}
                  className="px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium"
                >
                  Hoy
                </button>
                
                <button
                  onClick={goToNextWeek}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                <span className="text-lg font-semibold text-gray-700 ml-2">
                  {monthYear} - Semana {weekNumber}
                </span>
              </div>

              {/* Filtros */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    filterStatus === 'all'
                      ? 'bg-gray-200 text-gray-900 shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilterStatus('pending')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    filterStatus === 'pending'
                      ? 'bg-amber-100 text-amber-800 shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Pendientes
                </button>
                <button
                  onClick={() => setFilterStatus('completed')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    filterStatus === 'completed'
                      ? 'bg-emerald-100 text-emerald-800 shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Completadas
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Layout: Calendario + Estadísticas laterales */}
        <div className="flex gap-6">
          
          {/* Calendario Grid - Más ancho */}
          <div className="flex-1 bg-white rounded-2xl shadow-lg overflow-hidden">
            
            {/* Encabezado días de la semana */}
            <div className="grid grid-cols-8 border-b border-gray-200">
              <div className="p-4 bg-gray-50">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hora</span>
              </div>
              {weekDays.map((day, index) => {
                const today = isToday(day);
                return (
                  <div 
                    key={index} 
                    className={`p-4 text-center transition-colors ${
                      today ? 'bg-blue-50' : 'bg-gray-50'
                    }`}
                  >
                    <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                      today ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                    </div>
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
                      today 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-800'
                    }`}>
                      {day.getDate()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {day.toLocaleDateString('es-ES', { month: 'short' })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grilla de horas */}
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 12 }, (_, hour) => {
                const currentHour = hour + 8;
                return (
                  <div key={hour} className="grid grid-cols-8 hover:bg-gray-50 transition-colors">
                    
                    {/* Columna de hora */}
                    <div className="p-3 bg-gray-50 text-right border-r border-gray-100">
                      <span className="text-sm font-medium text-gray-600">
                        {currentHour.toString().padStart(2, '0')}:00
                      </span>
                    </div>
                    
                    {/* Celdas de cada día */}
                    {weekDays.map((day, dayIndex) => {
                      const dayEvents = getEventsForDay(day).filter(event => {
                        const eventHour = new Date(event.start).getHours();
                        return eventHour === currentHour;
                      });
                      const today = isToday(day);

                      return (
                        <div 
                          key={dayIndex} 
                          className={`p-2 min-h-[90px] border-r border-gray-100 last:border-r-0 ${
                            today ? 'bg-blue-50 bg-opacity-30' : ''
                          }`}
                        >
                          {dayEvents.map((event, eventIndex) => (
                            <div
                              key={eventIndex}
                              className={`p-3 mb-2 rounded-xl text-white text-xs cursor-pointer transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5 ${
                                getStatusColor(event.status, event.type)
                              }`}
                            >
                              <div className="font-bold truncate mb-1">
                                {event.title}
                              </div>
                              <div className="truncate opacity-90 text-xs mb-2">
                                {event.project}
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-medium">
                                  {new Date(event.start).toLocaleTimeString('es-ES', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </span>
                                <span className="text-xs bg-white bg-opacity-20 px-2 py-0.5 rounded-full">
                                  {event.type === 'completed' ? '✓' : '•'}
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

          {/* Burbujitas laterales - Estadísticas */}
          <div className="w-64 flex flex-col gap-4">
            
            {/* Total Tareas */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl shadow-xl p-6 text-white transform hover:scale-105 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium opacity-90">Total Tareas</span>
                <div className="bg-white bg-opacity-20 p-2 rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <div className="text-5xl font-bold mb-1">{allTasks.length}</div>
              <div className="text-sm opacity-80">En total</div>
            </div>
            
            {/* Pendientes */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl shadow-xl p-6 text-white transform hover:scale-105 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium opacity-90">Pendientes</span>
                <div className="bg-white bg-opacity-20 p-2 rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-5xl font-bold mb-1">{myTasks?.pending.length || 0}</div>
              <div className="text-sm opacity-80">Por completar</div>
            </div>
            
            {/* Completadas */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-xl p-6 text-white transform hover:scale-105 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium opacity-90">Completadas</span>
                <div className="bg-white bg-opacity-20 p-2 rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-5xl font-bold mb-1">{myTasks?.completed.length || 0}</div>
              <div className="text-sm opacity-80">Finalizadas</div>
            </div>
            
            {/* Esta Semana */}
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-xl p-6 text-white transform hover:scale-105 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium opacity-90">Esta Semana</span>
                <div className="bg-white bg-opacity-20 p-2 rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="text-5xl font-bold mb-1">
                {filteredEvents.filter(event => 
                  event.start >= weekDays[0] && event.start <= weekDays[6]
                ).length}
              </div>
              <div className="text-sm opacity-80">Programadas</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}