"use client";

import React, { useState, useEffect, useRef } from "react";
import { PlusCircle, Search, Pencil, Trash2 } from "lucide-react";
import ConfirmDialog from "@/app/(components)/ConfirmDialog/page";
import Header from "@/app/(components)/Header";
import CreateProjectModal from "./CreateProjectModal";
import {
  useGetProyectosQuery,
  useGetProyectoDetalleQuery,
  useCreateProyectoMutation,
  useUpdateProyectoMutation,
  useDeleteProyectoMutation,
  ProyectoResumen
} from "@/state/api";

// 🔥 NUEVO: Componente Modal de Éxito
function SuccessModal({ 
  isOpen, 
  onClose, 
  title, 
  message 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  message: string; 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 m-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">✓</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        
        <p className="text-gray-600 mb-6">{message}</p>
        
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}

// 🔥 NUEVO: Componente Modal de Error
function ErrorModal({ 
  isOpen, 
  onClose, 
  title, 
  message 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  message: string; 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 m-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">!</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        
        <p className="text-gray-600 mb-6">{message}</p>
        
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}

const ProjectsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProyecto, setSelectedProyecto] = useState<ProyectoResumen | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [proyectoToDelete, setProyectoToDelete] = useState<number | null>(null);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [proyectoIdParaDetalle, setProyectoIdParaDetalle] = useState<number | null>(null);
  const [forceReloadCount, setForceReloadCount] = useState(0);
  
  // 🔥 NUEVO: Estados para los modales
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    title: "",
    message: ""
  });
  
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: "",
    message: ""
  });
  
  // Usar useRef para evitar ciclos infinitos
  const lastProcessedId = useRef<number | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Queries y Mutations
  const { 
    data: proyectos, 
    isLoading, 
    isError,
    refetch 
  } = useGetProyectosQuery({});
  
  const [createProyecto, { isLoading: isCreating }] = useCreateProyectoMutation();
  const [updateProyecto, { isLoading: isUpdating }] = useUpdateProyectoMutation();
  const [deleteProyecto, { isLoading: isDeleting }] = useDeleteProyectoMutation();

  // Query para detalles del proyecto - CORREGIDO: solo recibe el ID
  const { 
    data: proyectoDetalleResponse,
    isLoading: loadingDetalle,
    isError: errorDetalle,
    refetch: refetchDetalle
  } = useGetProyectoDetalleQuery(proyectoIdParaDetalle!, {
    skip: !proyectoIdParaDetalle,
    refetchOnMountOrArgChange: true,
  });

  // Manejar la creación/edición de proyectos
  const handleCreateProyecto = async (proyectoData: any) => {
    try {
      console.log("📤 Enviando datos del proyecto:", proyectoData);
      
      let result;
      if (selectedProyecto) {
        // Editar proyecto existente
        console.log("✏️ Editando proyecto:", selectedProyecto.id_proyecto);
        result = await updateProyecto({
          id: selectedProyecto.id_proyecto,
          data: proyectoData,
        }).unwrap();
        console.log("✅ Proyecto editado:", result);
        
        // 🔥 MODIFICADO: Mostrar modal de éxito en lugar de alert
        setSuccessModal({
          isOpen: true,
          title: "¡Éxito!",
          message: "Proyecto actualizado exitosamente"
        });
      } else {
        // Crear nuevo proyecto
        console.log("🆕 Creando nuevo proyecto");
        result = await createProyecto(proyectoData).unwrap();
        console.log("✅ Proyecto creado:", result);
        
        // 🔥 MODIFICADO: Mostrar modal de éxito en lugar de alert
        setSuccessModal({
          isOpen: true,
          title: "¡Éxito!",
          message: "Proyecto creado exitosamente"
        });
      }
      
      // Limpiar estados y cerrar modal
      setIsModalOpen(false);
      setSelectedProyecto(null);
      setProyectoIdParaDetalle(null);
      setForceReloadCount(0);
      cleanupRetryTimeout();
      
      // Recargar la lista de proyectos
      refetch();
      
    } catch (err: any) {
      console.error("❌ Error completo al crear/editar proyecto:", err);
      
      let errorMessage = "No se pudo procesar el proyecto. Revisa los campos obligatorios.";
      
      if (err?.data?.message) {
        errorMessage = err.data.message;
      } else if (err?.data?.Mensaje) {
        errorMessage = err.data.Mensaje;
      } else if (err?.error) {
        errorMessage = err.error;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.status === 400) {
        errorMessage = "Error 400: Solicitud incorrecta. Verifica la estructura de los datos.";
      }
      
      // 🔥 MODIFICADO: Mostrar modal de error en lugar de alert
      setErrorModal({
        isOpen: true,
        title: "Error",
        message: errorMessage
      });
    }
  };

  // Limpiar timeout de reintento
  const cleanupRetryTimeout = () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };

  // Manejar la edición de proyecto
  const handleEdit = async (proyecto: ProyectoResumen) => {
    try {
      console.log("🔄 [PAGE-DEBUG] Iniciando edición del proyecto:", proyecto.id_proyecto, proyecto.nombre);
      
      // Limpiar cualquier reintento pendiente
      cleanupRetryTimeout();
      
      // Resetear estados primero
      setIsLoadingEdit(true);
      setSelectedProyecto(null);
      setProyectoIdParaDetalle(null);
      setForceReloadCount(0);
      lastProcessedId.current = null;
      
      // Delay para limpiar cache
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Establecer el ID para activar la query de detalles
      setProyectoIdParaDetalle(proyecto.id_proyecto);
      
      console.log("✅ [PAGE-DEBUG] Estado actualizado - ID solicitado:", proyecto.id_proyecto);
      
    } catch (error) {
      console.error("❌ Error al iniciar edición:", error);
      
      // 🔥 MODIFICADO: Mostrar modal de error en lugar de alert
      setErrorModal({
        isOpen: true,
        title: "Error",
        message: "Error al cargar los datos del proyecto"
      });
      
      setIsLoadingEdit(false);
      setProyectoIdParaDetalle(null);
      cleanupRetryTimeout();
    }
  };

  // Función para forzar recarga hasta que coincidan los IDs
  const forceReloadUntilMatch = (solicitadoId: number, currentRetry: number = 0) => {
    const MAX_RETRIES = 5;
    
    if (currentRetry >= MAX_RETRIES) {
      console.error("❌ [PAGE-DEBUG] MÁXIMO DE REINTENTOS ALCANZADO");
      
      // 🔥 MODIFICADO: Mostrar modal de error en lugar de alert
      setErrorModal({
        isOpen: true,
        title: "Error",
        message: "No se pudo cargar el proyecto correcto después de múltiples intentos. Por favor, recarga la página e intenta nuevamente."
      });
      
      setIsLoadingEdit(false);
      setProyectoIdParaDetalle(null);
      cleanupRetryTimeout();
      return;
    }

    console.log(`🔄 [PAGE-DEBUG] Reintento forzado ${currentRetry + 1}/${MAX_RETRIES} para ID: ${solicitadoId}`);
    
    // Incrementar contador para forzar recarga (aunque no se use en el query, ayuda a trigger re-renders)
    setForceReloadCount(prev => prev + 1);
    
    // Forzar recarga manualmente
    refetchDetalle();
    
    // Programar siguiente reintento si es necesario
    retryTimeoutRef.current = setTimeout(() => {
      if (proyectoIdParaDetalle === solicitadoId) {
        forceReloadUntilMatch(solicitadoId, currentRetry + 1);
      }
    }, 500 * (currentRetry + 1)); // Delay creciente
  };

  // Effect para manejar cuando los detalles del proyecto se cargan
  useEffect(() => {
    if (!proyectoIdParaDetalle) return;

    console.log("🔍 [PAGE-DEBUG] useEffect detalles - Estado:", {
      proyectoIdParaDetalle,
      loadingDetalle,
      hasResponse: !!proyectoDetalleResponse,
      responseId: proyectoDetalleResponse?.id_proyecto,
      forceReloadCount,
      lastProcessedId: lastProcessedId.current
    });

    // Evitar procesar el mismo ID múltiples veces
    if (lastProcessedId.current === proyectoIdParaDetalle) {
      console.log("⏭️ [PAGE-DEBUG] ID ya procesado, saltando...");
      return;
    }

    // Solo procesar si tenemos una respuesta y no está cargando
    if (proyectoDetalleResponse && !loadingDetalle) {
      console.log("📥 [PAGE-DEBUG] Respuesta recibida:", proyectoDetalleResponse);
      
      // VERIFICACIÓN CRÍTICA: Confirmar que la respuesta corresponde al ID solicitado
      const respuestaId = proyectoDetalleResponse.id_proyecto;
      const solicitadoId = proyectoIdParaDetalle;
      
      if (respuestaId && respuestaId === solicitadoId) {
        console.log("✅ [PAGE-DEBUG] IDs COINCIDEN EXACTAMENTE - Procesando proyecto:", respuestaId);
        
        // Marcar como procesado
        lastProcessedId.current = solicitadoId;
        
        setSelectedProyecto(proyectoDetalleResponse);
        setIsModalOpen(true);
        
        // Limpiar estados
        setIsLoadingEdit(false);
        setProyectoIdParaDetalle(null);
        setForceReloadCount(0);
        cleanupRetryTimeout();
        
      } else {
        console.error("❌ [PAGE-DEBUG] DISCREPANCIA CRÍTICA DE IDs:", {
          solicitado: solicitadoId,
          recibido: respuestaId
        });
        
        // NO proceder con los datos incorrectos
        // Forzar recarga agresiva hasta que coincidan
        forceReloadUntilMatch(solicitadoId);
      }
      
    } else if (errorDetalle) {
      console.error("❌ [PAGE-DEBUG] Error cargando detalles:", errorDetalle);
      
      // Reintentar también en caso de error
      if (proyectoIdParaDetalle) {
        forceReloadUntilMatch(proyectoIdParaDetalle);
      } else {
        // 🔥 MODIFICADO: Mostrar modal de error en lugar de alert
        setErrorModal({
          isOpen: true,
          title: "Error",
          message: "Error al cargar los datos del proyecto para editar"
        });
        
        setIsLoadingEdit(false);
        setProyectoIdParaDetalle(null);
        cleanupRetryTimeout();
      }
    }
  }, [proyectoDetalleResponse, loadingDetalle, errorDetalle, proyectoIdParaDetalle, forceReloadCount, refetchDetalle]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      cleanupRetryTimeout();
    };
  }, []);

  // Manejar eliminación de proyecto
  const handleDeleteClick = (id: number) => {
    setProyectoToDelete(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (proyectoToDelete !== null) {
      try {
        await deleteProyecto(proyectoToDelete).unwrap();
        
        // 🔥 MODIFICADO: Mostrar modal de éxito en lugar de alert
        setSuccessModal({
          isOpen: true,
          title: "¡Éxito!",
          message: "Proyecto eliminado exitosamente"
        });
        
        refetch();
      } catch (err: any) {
        console.error("❌ Error al eliminar proyecto:", err);
        
        // 🔥 MODIFICADO: Mostrar modal de error en lugar de alert
        setErrorModal({
          isOpen: true,
          title: "Error",
          message: "Error al eliminar el proyecto"
        });
      }
    }
    setProyectoToDelete(null);
    setConfirmOpen(false);
  };

  // Manejar cierre del modal
  const handleCloseModal = () => {
    console.log("🚪 Cerrando modal, limpiando estados...");
    setIsModalOpen(false);
    setSelectedProyecto(null);
    setProyectoIdParaDetalle(null);
    setForceReloadCount(0);
    cleanupRetryTimeout();
  };

  // Estados de loading
  const isLoadingGeneral = isLoading || isCreating || isUpdating || isDeleting;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-lg mb-4">Error al cargar proyectos</div>
        <button 
          onClick={() => refetch()}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!proyectos || proyectos.length === 0) {
    return (
      <div className="mx-auto pb-5 w-full">
        <div className="flex justify-between items-center mb-6">
          <Header name="Proyectos" />
          <button
            className="flex items-center bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => setIsModalOpen(true)}
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Crear Proyecto
          </button>
        </div>
        <div className="text-center py-8 text-gray-500">
          No hay proyectos registrados
        </div>
        
        <CreateProjectModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onCreate={handleCreateProyecto}
          proyecto={null}
        />

        {/* 🔥 NUEVO: Modales personalizados */}
        <SuccessModal
          isOpen={successModal.isOpen}
          onClose={() => setSuccessModal({ ...successModal, isOpen: false })}
          title={successModal.title}
          message={successModal.message}
        />
        
        <ErrorModal
          isOpen={errorModal.isOpen}
          onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
          title={errorModal.title}
          message={errorModal.message}
        />
      </div>
    );
  }

  const filteredProyectos = proyectos.filter((p: ProyectoResumen) =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mx-auto pb-5 w-full">
      {/* SEARCH */}
      <div className="mb-6 flex items-center border-2 border-gray-200 rounded">
        <Search className="w-5 h-5 text-gray-500 m-2" />
        <input
          className="w-full py-2 px-4 rounded bg-white focus:outline-none focus:border-blue-500"
          placeholder="Buscar Proyectos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <Header name="Proyectos" />
        <button
          className="flex items-center bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => {
            console.log("🆕 Abriendo modal para crear nuevo proyecto");
            setSelectedProyecto(null);
            setProyectoIdParaDetalle(null);
            setForceReloadCount(0);
            cleanupRetryTimeout();
            setIsModalOpen(true);
          }}
          disabled={isLoadingGeneral}
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Crear Proyecto
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="py-3 px-4 text-left font-semibold text-gray-700">Nombre</th>
              <th className="py-3 px-4 text-left font-semibold text-gray-700">Inicio</th>
              <th className="py-3 px-4 text-left font-semibold text-gray-700">Fin</th>
              <th className="py-3 px-4 text-left font-semibold text-gray-700">Presupuesto</th>
              <th className="py-3 px-4 text-center font-semibold text-gray-700">Operación</th>
            </tr>
          </thead>
          <tbody>
            {filteredProyectos.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  {searchTerm ? "No se encontraron proyectos que coincidan con la búsqueda" : "No hay proyectos registrados"}
                </td>
              </tr>
            ) : (
              filteredProyectos.map((proyecto: ProyectoResumen) => (
                <tr 
                  key={proyecto.id_proyecto} 
                  className="border-b hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4 font-medium">{proyecto.nombre}</td>
                  <td className="py-3 px-4">
                    {new Date(proyecto.fecha_inicio).toLocaleDateString('es-ES')}
                  </td>
                  <td className="py-3 px-4">
                    {proyecto.fecha_fin 
                      ? new Date(proyecto.fecha_fin).toLocaleDateString('es-ES') 
                      : "—"
                    }
                  </td>
                  <td className="py-3 px-4">
                    {proyecto.presupuesto 
                      ? `$${proyecto.presupuesto.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                      : "—"
                    }
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-center gap-3">
                      <button
                        className={`text-blue-500 hover:text-blue-700 transition-colors ${
                          isLoadingEdit ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={() => handleEdit(proyecto)}
                        disabled={isLoadingEdit || isLoadingGeneral}
                        title="Editar proyecto"
                      >
                        {isLoadingEdit && proyectoIdParaDetalle === proyecto.id_proyecto ? (
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs">Forzando carga...</span>
                          </div>
                        ) : (
                          <Pencil className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => handleDeleteClick(proyecto.id_proyecto)}
                        disabled={isLoadingGeneral}
                        title="Eliminar proyecto"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL CREAR/EDITAR */}
      <CreateProjectModal
        key={selectedProyecto?.id_proyecto || "new"}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onCreate={handleCreateProyecto}
        proyecto={selectedProyecto}
      />

      {/* CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Eliminar proyecto"
        message="¿Estás seguro de que quieres eliminar este proyecto? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setProyectoToDelete(null);
        }}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />

      {/* 🔥 NUEVO: Modales personalizados */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ ...successModal, isOpen: false })}
        title={successModal.title}
        message={successModal.message}
      />
      
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
        title={errorModal.title}
        message={errorModal.message}
      />

      {/* LOADING OVERLAY PARA OPERACIONES GENERALES */}
      {(isCreating || isUpdating || isDeleting) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-gray-700">
              {isCreating && "Creando proyecto..."}
              {isUpdating && "Actualizando proyecto..."}
              {isDeleting && "Eliminando proyecto..."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;