"use client";

import React, { useState, useEffect } from "react";
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

const ProjectsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProyecto, setSelectedProyecto] = useState<ProyectoResumen | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [proyectoToDelete, setProyectoToDelete] = useState<number | null>(null);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [proyectoIdParaDetalle, setProyectoIdParaDetalle] = useState<number | null>(null);
  const [lastRequestedId, setLastRequestedId] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0); // ← NUEVO: contador de reintentos

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

  // Query para detalles del proyecto - CON CACHE DESACTIVADO
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
        alert("Proyecto actualizado exitosamente");
      } else {
        // Crear nuevo proyecto
        console.log("🆕 Creando nuevo proyecto");
        result = await createProyecto(proyectoData).unwrap();
        console.log("✅ Proyecto creado:", result);
        alert("Proyecto creado exitosamente");
      }
      
      // Limpiar estados y cerrar modal
      setIsModalOpen(false);
      setSelectedProyecto(null);
      setProyectoIdParaDetalle(null);
      setLastRequestedId(null);
      setRetryCount(0); // ← Resetear contador
      
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
      
      alert(`Error: ${errorMessage}`);
    }
  };

  // Manejar la edición de proyecto - MEJORADO
  const handleEdit = async (proyecto: ProyectoResumen) => {
    try {
      console.log("🔄 [PAGE-DEBUG] Iniciando edición del proyecto:", proyecto.id_proyecto, proyecto.nombre);
      
      // Resetear estados primero
      setIsLoadingEdit(true);
      setSelectedProyecto(null);
      setLastRequestedId(proyecto.id_proyecto);
      setRetryCount(0); // ← Resetear contador de reintentos
      
      // Pequeño delay para asegurar limpieza de estado
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Establecer el ID para activar la query de detalles
      setProyectoIdParaDetalle(proyecto.id_proyecto);
      
      console.log("✅ [PAGE-DEBUG] Estado actualizado - ID solicitado:", proyecto.id_proyecto);
      
    } catch (error) {
      console.error("❌ Error al iniciar edición:", error);
      alert("Error al cargar los datos del proyecto");
      setIsLoadingEdit(false);
      setProyectoIdParaDetalle(null);
      setLastRequestedId(null);
      setRetryCount(0);
    }
  };

  // Effect para manejar cuando los detalles del proyecto se cargan - MEJORADO
  useEffect(() => {
    console.log("🔍 [PAGE-DEBUG] useEffect detalles - Estado:", {
      proyectoIdParaDetalle,
      lastRequestedId,
      loadingDetalle,
      hasResponse: !!proyectoDetalleResponse,
      responseId: proyectoDetalleResponse?.id_proyecto,
      retryCount
    });

    // Solo procesar si tenemos una respuesta y no está cargando
    if (proyectoDetalleResponse && !loadingDetalle && proyectoIdParaDetalle) {
      console.log("📥 [PAGE-DEBUG] Respuesta recibida:", proyectoDetalleResponse);
      
      // VERIFICACIÓN CRÍTICA: Confirmar que la respuesta corresponde al ID solicitado
      const respuestaId = proyectoDetalleResponse.id_proyecto;
      const solicitadoId = proyectoIdParaDetalle;
      
      if (respuestaId && respuestaId === solicitadoId) {
        console.log("✅ [PAGE-DEBUG] IDs COINCIDEN - Procesando proyecto:", respuestaId);
        
        setSelectedProyecto(proyectoDetalleResponse);
        setIsModalOpen(true);
        
        // Limpiar estados
        setIsLoadingEdit(false);
        setProyectoIdParaDetalle(null);
        setLastRequestedId(null);
        setRetryCount(0);
        
      } else {
        console.error("❌ [PAGE-DEBUG] DISCREPANCIA DE IDs:", {
          solicitado: solicitadoId,
          recibido: respuestaId,
          retryCount
        });
        
        // Reintentar máximo 3 veces
        if (retryCount < 3) {
          const newRetryCount = retryCount + 1;
          setRetryCount(newRetryCount);
          console.log(`🔄 [PAGE-DEBUG] Reintento ${newRetryCount}/3...`);
          
          // Forzar recarga manual con delay
          setTimeout(() => {
            refetchDetalle();
          }, 300);
        } else {
          console.error("❌ [PAGE-DEBUG] Máximo de reintentos alcanzado");
          alert("Error: No se pudo cargar el proyecto correctamente después de varios intentos");
          setIsLoadingEdit(false);
          setProyectoIdParaDetalle(null);
          setLastRequestedId(null);
          setRetryCount(0);
        }
      }
      
    } else if (errorDetalle && proyectoIdParaDetalle) {
      console.error("❌ [PAGE-DEBUG] Error cargando detalles:", errorDetalle);
      alert("Error al cargar los datos del proyecto para editar");
      setIsLoadingEdit(false);
      setProyectoIdParaDetalle(null);
      setLastRequestedId(null);
      setRetryCount(0);
    }
  }, [proyectoDetalleResponse, loadingDetalle, errorDetalle, proyectoIdParaDetalle, refetchDetalle, retryCount]);

  // Effect adicional para forzar recarga cuando cambia el ID solicitado
  useEffect(() => {
    if (proyectoIdParaDetalle && proyectoIdParaDetalle !== lastRequestedId) {
      console.log("🔄 [PAGE-DEBUG] ID cambiado, forzando recarga:", proyectoIdParaDetalle);
      setLastRequestedId(proyectoIdParaDetalle);
      setRetryCount(0); // Resetear contador cuando cambia el ID
      refetchDetalle();
    }
  }, [proyectoIdParaDetalle, lastRequestedId, refetchDetalle]);

  // Manejar eliminación de proyecto
  const handleDeleteClick = (id: number) => {
    setProyectoToDelete(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (proyectoToDelete !== null) {
      try {
        await deleteProyecto(proyectoToDelete).unwrap();
        alert("Proyecto eliminado exitosamente");
        refetch();
      } catch (err: any) {
        console.error("❌ Error al eliminar proyecto:", err);
        alert("Error al eliminar el proyecto");
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
    setLastRequestedId(null);
    setRetryCount(0); // ← Resetear contador
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
            setLastRequestedId(null);
            setRetryCount(0);
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
                        {isLoadingEdit && lastRequestedId === proyecto.id_proyecto ? (
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs">Cargando...</span>
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

      {/* MODAL CREAR/EDITAR - CON KEY ÚNICO PARA FORZAR REMOUNT */}
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