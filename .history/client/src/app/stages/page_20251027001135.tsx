'use client';

import React, { useState, useEffect } from 'react';
import { useGetProyectosQuery } from "@/state/api";
import { EtapasList } from './EtapasList';

export default function StagesPage() {
  const [selectedProyecto, setSelectedProyecto] = useState<number | null>(null);
  const { data: proyectos, isLoading, error } = useGetProyectosQuery({});

  // Seleccionar el primer proyecto por defecto cuando se cargan
  useEffect(() => {
    if (proyectos && proyectos.length > 0 && !selectedProyecto) {
      setSelectedProyecto(proyectos[0].id_proyecto);
    }
  }, [proyectos, selectedProyecto]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">Cargando proyectos...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-red-500 text-center py-8">
            Error cargando proyectos
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestión de Etapas de Proyectos
          </h1>
          <p className="text-gray-600">
            Asocia y gestiona las etapas de tus proyectos
          </p>
        </div>

        {/* Selector de Proyecto */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-4">
            <label htmlFor="proyecto-select" className="text-sm font-medium text-gray-700">
              Seleccionar Proyecto:
            </label>
            <select
              id="proyecto-select"
              value={selectedProyecto || ''}
              onChange={(e) => setSelectedProyecto(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[300px]"
            >
              <option value="">Selecciona un proyecto</option>
              {proyectos?.map((proyecto) => (
                <option key={proyecto.id_proyecto} value={proyecto.id_proyecto}>
                  {proyecto.nombre} - {proyecto.nombre_cliente}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de Etapas */}
        {selectedProyecto && proyectos ? (
          <EtapasList
            proyectoId={selectedProyecto}
            proyectoNombre={
              proyectos.find(p => p.id_proyecto === selectedProyecto)?.nombre || 'Proyecto'
            }
          />
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500">
              Selecciona un proyecto para gestionar sus etapas
            </p>
          </div>
        )}
      </div>
    </div>
  );
}