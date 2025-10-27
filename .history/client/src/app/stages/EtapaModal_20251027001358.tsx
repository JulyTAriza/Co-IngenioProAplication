'use client';

import React, { useState, useEffect } from 'react';
import { EtapaProyecto, NuevaEtapaPayload } from "@/state/api";;

interface EtapaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (etapaData: NuevaEtapaPayload) => Promise<void>;
  etapa?: EtapaProyecto | null;
  isLoading: boolean;
}

const ETAPAS_PERMITIDAS = ['Preparación', 'Ejecución', 'Etapa Inicial', 'Etapa Final'] as const;
const ESTADOS = ['Pendiente', 'En Progreso', 'Completado', 'Atrasado', 'Cancelado'] as const;

export const EtapaModal: React.FC<EtapaModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  etapa,
  isLoading,
}) => {
  const [formData, setFormData] = useState({
    nombre_etapa: '',
    description: '',
    fecha_inicio: '',
    fecha_fin: '',
    estado: 'Pendiente',
  });
  const [error, setError] = useState<string>('');

  // Reset form when modal opens/closes or etapa changes
  useEffect(() => {
    if (isOpen) {
      if (etapa) {
        setFormData({
          nombre_etapa: etapa.nombre_etapa,
          description: etapa.description || '',
          fecha_inicio: etapa.fecha_inicio,
          fecha_fin: etapa.fecha_fin,
          estado: etapa.estado,
        });
      } else {
        setFormData({
          nombre_etapa: '',
          description: '',
          fecha_inicio: '',
          fecha_fin: '',
          estado: 'Pendiente',
        });
      }
      setError('');
    }
  }, [isOpen, etapa]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!formData.nombre_etapa) {
      setError('El nombre de la etapa es requerido');
      return;
    }

    if (!formData.fecha_inicio || !formData.fecha_fin) {
      setError('Las fechas de inicio y fin son requeridas');
      return;
    }

    if (new Date(formData.fecha_inicio) > new Date(formData.fecha_fin)) {
      setError('La fecha de inicio no puede ser posterior a la fecha fin');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la etapa');
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">
          {etapa ? 'Editar Etapa' : 'Nueva Etapa'}
        </h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de Etapa *
            </label>
            <select
              value={formData.nombre_etapa}
              onChange={(e) => handleChange('nombre_etapa', e.target.value)}
              required
              disabled={isLoading}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Seleccionar etapa</option>
              {ETAPAS_PERMITIDAS.map((etapa) => (
                <option key={etapa} value={etapa}>
                  {etapa}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              disabled={isLoading}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="Descripción de la etapa..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Inicio *
              </label>
              <input
                type="date"
                value={formData.fecha_inicio}
                onChange={(e) => handleChange('fecha_inicio', e.target.value)}
                required
                disabled={isLoading}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Fin *
              </label>
              <input
                type="date"
                value={formData.fecha_fin}
                onChange={(e) => handleChange('fecha_fin', e.target.value)}
                required
                disabled={isLoading}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={formData.estado}
              onChange={(e) => handleChange('estado', e.target.value)}
              disabled={isLoading}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                etapa ? 'Actualizar' : 'Crear'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};