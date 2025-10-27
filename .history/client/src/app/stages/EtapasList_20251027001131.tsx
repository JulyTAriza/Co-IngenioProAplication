'use client';

import React, { useState } from 'react';
import {
  useGetEtapasByProyectoQuery,
  useCreateEtapaMutation,
  useUpdateEtapaMutation,
  useDeleteEtapaMutation,
} from "@/state/api";
import { EtapaProyecto, NuevaEtapaPayload } from "@/state/api";;
import { EtapaModal } from './EtapaModal';

interface EtapasListProps {
  proyectoId: number;
  proyectoNombre: string;
}

const ETAPAS_PERMITIDAS = ['Preparación', 'Ejecución', 'Etapa Inicial', 'Etapa Final'] as const;
const ESTADOS = ['Pendiente', 'En Progreso', 'Completado', 'Atrasado', 'Cancelado'] as const;

export const EtapasList: React.FC<EtapasListProps> = ({ proyectoId, proyectoNombre }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingEtapa, setEditingEtapa] = useState<EtapaProyecto | null>(null);
  
  const { data: etapas, isLoading, error, refetch } = useGetEtapasByProyectoQuery(proyectoId);
  const [createEtapa, { isLoading: isCreating }] = useCreateEtapaMutation();
  const [updateEtapa, { isLoading: isUpdating }] = useUpdateEtapaMutation();
  const [deleteEtapa, { isLoading: isDeleting }] = useDeleteEtapaMutation();

  const handleCreateEtapa = async (etapaData: NuevaEtapaPayload) => {
    try {
      await createEtapa({ proyectoId, data: etapaData }).unwrap();
      setShowModal(false);
      refetch();
    } catch (error) {
      console.error('Error creando etapa:', error);
      throw new Error('Error al crear la etapa');
    }
  };

  const handleUpdateEtapa = async (etapaData: NuevaEtapaPayload) => {
    if (!editingEtapa) return;
    
    try {
      await updateEtapa({ 
        etapaId: editingEtapa.id_etapa, 
        data: etapaData 
      }).unwrap();
      setShowModal(false);
      setEditingEtapa(null);
      refetch();
    } catch (error) {
      console.error('Error actualizando etapa:', error);
      throw new Error('Error al actualizar la etapa');
    }
  };

  const handleEdit = (etapa: EtapaProyecto) => {
    setEditingEtapa(etapa);
    setShowModal(true);
  };

  const handleDelete = async (etapaId: number, nombreEtapa: string) => {
    if (confirm(`¿Estás seguro de que quieres eliminar la etapa "${nombreEtapa}"?`)) {
      try {
        await deleteEtapa(etapaId).unwrap();
        refetch();
      } catch (error) {
        console.error('Error eliminando etapa:', error);
        alert('Error al eliminar la etapa');
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEtapa(null);
  };

  const handleOpenCreateModal = () => {
    setEditingEtapa(null);
    setShowModal(true);
  };

  const isLoadingAny = isLoading || isCreating || isUpdating || isDeleting;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">Cargando etapas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-red-500 text-center py-8">
          Error cargando las etapas del proyecto
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Etapas del Proyecto
          </h2>
          <p className="text-gray-600 mt-1">{proyectoNombre}</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          disabled={isLoadingAny}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span>+</span>
          <span>Agregar Etapa</span>
        </button>
      </div>

      {/* Lista de Etapas */}
      <div className="space-y-4">
        {etapas?.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-gray-500 mb-2">No hay etapas registradas</div>
            <div className="text-sm text-gray-400">
              Haz clic en "Agregar Etapa" para comenzar
            </div>
          </div>
        ) : (
          etapas?.map((etapa) => (
            <div
              key={etapa.id_etapa}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-gray-800">
                      {etapa.nombre_etapa}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        etapa.estado === 'Completado'
                          ? 'bg-green-100 text-green-800'
                          : etapa.estado === 'En Progreso'
                          ? 'bg-blue-100 text-blue-800'
                          : etapa.estado === 'Atrasado'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {etapa.estado}
                    </span>
                  </div>
                  
                  {etapa.description && (
                    <p className="text-gray-600 mb-3">{etapa.description}</p>
                  )}
                  
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <strong>Inicio:</strong> 
                      {new Date(etapa.fecha_inicio).toLocaleDateString('es-ES')}
                    </span>
                    <span className="flex items-center gap-1">
                      <strong>Fin:</strong> 
                      {new Date(etapa.fecha_fin).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(etapa)}
                    disabled={isLoadingAny}
                    className="px-3 py-1 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50 text-sm"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(etapa.id_etapa, etapa.nombre_etapa)}
                    disabled={isLoadingAny}
                    className="px-3 py-1 text-red-600 border border-red-600 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      <EtapaModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSubmit={editingEtapa ? handleUpdateEtapa : handleCreateEtapa}
        etapa={editingEtapa}
        isLoading={isCreating || isUpdating}
      />
    </div>
  );
};