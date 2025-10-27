'use client';

import React, { useState } from 'react';
import {
  useGetEtapasByProyectoQuery,
  useCreateEtapaMutation,
  useUpdateEtapaMutation,
  useDeleteEtapaMutation,
} from "@/state/api";
import { EtapaProyecto, NuevaEtapaPayload } from "@/state/api";
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [etapaToDelete, setEtapaToDelete] = useState<{ id: number; nombre: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  const { data: etapas, isLoading, error, refetch } = useGetEtapasByProyectoQuery(proyectoId);
  const [createEtapa, { isLoading: isCreating }] = useCreateEtapaMutation();
  const [updateEtapa, { isLoading: isUpdating }] = useUpdateEtapaMutation();
  const [deleteEtapa, { isLoading: isDeleting }] = useDeleteEtapaMutation();

  const handleCreateEtapa = async (etapaData: NuevaEtapaPayload) => {
    try {
      await createEtapa({ proyectoId, data: etapaData }).unwrap();
      setShowModal(false);
      setSuccessMessage('Etapa creada exitosamente');
      setShowSuccessModal(true);
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
      setSuccessMessage('Etapa actualizada exitosamente');
      setShowSuccessModal(true);
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

  const handleDeleteClick = (etapaId: number, nombreEtapa: string) => {
    setEtapaToDelete({ id: etapaId, nombre: nombreEtapa });
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!etapaToDelete) return;
    
    try {
      await deleteEtapa(etapaToDelete.id).unwrap();
      setShowDeleteConfirm(false);
      setSuccessMessage(`Etapa "${etapaToDelete.nombre}" eliminada exitosamente`);
      setShowSuccessModal(true);
      setEtapaToDelete(null);
      refetch();
    } catch (error) {
      console.error('Error eliminando etapa:', error);
      setShowDeleteConfirm(false);
      setEtapaToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setEtapaToDelete(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEtapa(null);
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessMessage('');
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
                    onClick={() => handleDeleteClick(etapa.id_etapa, etapa.nombre_etapa)}
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

      {/* Modal de Crear/Editar Etapa */}
      <EtapaModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSubmit={editingEtapa ? handleUpdateEtapa : handleCreateEtapa}
        etapa={editingEtapa}
        isLoading={isCreating || isUpdating}
      />

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteConfirm && etapaToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
            <div className="text-center">
              {/* Icono de advertencia */}
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              {/* Título */}
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                ¿Eliminar Etapa?
              </h3>
              
              {/* Mensaje */}
              <p className="text-gray-600 mb-2">
                ¿Estás seguro de que quieres eliminar la etapa
              </p>
              <p className="text-gray-900 font-semibold mb-6">
                "{etapaToDelete.nombre}"?
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Esta acción no se puede deshacer.
              </p>
              
              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    'Eliminar'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Éxito */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl animate-bounce-in">
            <div className="text-center">
              {/* Icono de éxito con animación */}
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              {/* Título */}
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                ¡Éxito!
              </h3>
              
              {/* Mensaje */}
              <p className="text-gray-600 mb-6 text-lg">
                {successMessage}
              </p>
              
              {/* Botón */}
              <button
                onClick={handleCloseSuccessModal}
                className="bg-green-600 text-white px-8 py-3 rounded-xl hover:bg-green-700 transition-colors w-full font-medium text-lg"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilos para animaciones */}
      <style jsx>{`
        @keyframes bounce-in {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes scale-in {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }
        
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
        
        .animate-scale-in {
          animation: scale-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
};