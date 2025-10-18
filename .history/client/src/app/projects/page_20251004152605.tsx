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

  // Query para detalles del proyecto
  const { 
    data: proyectoDetalleResponse,
    isLoading: loadingDetalle,
    isError: errorDetalle,
  } = useGetProyectoDetalleQuery(proyectoIdParaDetalle!, {
    skip: !proyectoIdParaDetalle,
  });

  // Manejar la creación/edición de proyectos - MEJORADO
  const handleCreateProyecto = async (proyectoData: any) => {
    try {
      console.log(" Enviando datos del proyecto:", proyectoData);
      
      let result;
      if (selectedProyecto) {
        // Editar proyecto existente
        console.log(" Editando proyecto:", selectedProyecto.id_proyecto);
        result = await updateProyecto({
          id: selectedProyecto.id_proyecto,
          data: proyectoData,
        }).unwrap();
        console.log("Proyecto editado:", result);
        alert("Proyecto actualizado exitosamente");
      } else {
        // Crear nuevo proyecto
        console.log("Creando nuevo proyecto");
        
        // DEBUG: Verificar estructura exacta del payload
        console.log("DEBUG - Payload estructura:", {
          nombre: typeof proyectoData.nombre,
          descripcion: typeof proyectoData.descripcion,
          nombre_ciudad: typeof proyectoData.nombre_ciudad,
          departamento: typeof proyectoData.departamento,
          nombre_cliente: typeof proyectoData.nombre_cliente,
          email_cliente: typeof proyectoData.email_cliente,
          telefono_cliente: typeof proyectoData.telefono_cliente,
          direccion_cliente: typeof proyectoData.direccion_cliente,
          fecha_inicio: typeof proyectoData.fecha_inicio,
          fecha_fin: typeof proyectoData.fecha_fin,
          presupuesto: typeof proyectoData.presupuesto,
          equipo: Array.isArray(proyectoData.equipo),
          materiales: Array.isArray(proyectoData.materiales)
        });
        
        result = await createProyecto(proyectoData).unwrap();
        console.log(" Proyecto creado:", result);
        alert("Proyecto creado exitosamente");
      }
      
      // Limpiar estados y cerrar modal
      setIsModalOpen(false);
      setSelectedProyecto(null);
      setProyectoIdParaDetalle(null);
      
      // Recargar la lista de proyectos
      refetch();
      
    } catch (err: any) {
      console.error(" Error completo al crear/editar proyecto:", err);
      
      // DEBUG más detallado
      console.error(" DEBUG - Error details:", {
        status: err?.status,
        statusText: err?.statusText,
        data: err?.data,
        message: err?.message,
        originalError: err
      });
      
      // Mostrar mensaje de error más específico
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
        errorMessage = "Error 400: Solicitud incorrecta. El servidor rechazó la petición. Verifica la estructura de los datos.";
      }
      
      alert(`Error: ${errorMessage}`);
    }
  };

  // Manejar la edición de proyecto - CORREGIDO
  const handleEdit = async (proyecto: ProyectoResumen) => {
    try {
      setIsLoadingEdit(true);
      console.log("🔄 Cargando datos completos del proyecto:", proyecto.id_proyecto);
      
      // Establecer el ID para activar la query de detalles
      setProyectoIdParaDetalle(proyecto.id_proyecto);
      
    } catch (error) {
      console.error("Error al cargar proyecto:", error);
      alert("Error al cargar los datos del proyecto");
      setIsLoadingEdit(false);
      setProyectoIdParaDetalle(null);
    }
  };

  // Effect para manejar cuando los detalles del proyecto se cargan - CORREGIDO
  useEffect(() => {
    if (proyectoDetalleResponse && proyectoIdParaDetalle && !loadingDetalle) {
      console.log("✅ Respuesta de detalles del proyecto:", proyectoDetalleResponse);
      
      // PROBLEMA: El backend está devolviendo solo el ID (11) en lugar del objeto completo
      // SOLUCIÓN: Buscar el proyecto en la lista existente
      let proyectoCompleto: ProyectoResumen | undefined;
      
      if (typeof proyectoDetalleResponse === 'number') {
        // El backend devolvió solo el ID, buscar en la lista de proyectos
        console.log("🔍 Backend devolvió solo ID, buscando en lista...");
        proyectoCompleto = proyectos?.find((p: ProyectoResumen) => p.id_proyecto === proyectoDetalleResponse);
        
        if (proyectoCompleto) {
          console.log("✅ Proyecto encontrado en lista:", proyectoCompleto);
        } else {
          console.error("❌ No se encontró el proyecto en la lista");
        }
      } else if (proyectoDetalleResponse && typeof proyectoDetalleResponse === 'object') {
        // Es un objeto, usar directamente
        proyectoCompleto = proyectoDetalleResponse;
      }
      
      if (proyectoCompleto) {
        console.log("✅ Proyecto completo para editar:", proyectoCompleto);
        setSelectedProyecto(proyectoCompleto);
        setIsModalOpen(true);
      } else {
        console.error("❌ No se pudo obtener el proyecto completo");
        alert("Error: No se pudieron cargar los datos completos del proyecto");
      }
      
      setIsLoadingEdit(false);
      setProyectoIdParaDetalle(null); // Limpiar para próxima vez
    }
    
    if (errorDetalle && proyectoIdParaDetalle) {
      console.error("❌ Error cargando detalles:", errorDetalle);
      alert("Error al cargar los datos del proyecto para editar");
      setIsLoadingEdit(false);
      setProyectoIdParaDetalle(null);
    }
  }, [proyectoDetalleResponse, loadingDetalle, errorDetalle, proyectoIdParaDetalle, proyectos]);

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
        refetch(); // Recargar la lista
      } catch (err: any) {
        console.error("Error al eliminar proyecto:", err);
        alert("Error al eliminar el proyecto");
      }
    }
    setProyectoToDelete(null);
    setConfirmOpen(false);
  };

  // Manejar cierre del modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProyecto(null);
    setProyectoIdParaDetalle(null);
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
            setSelectedProyecto(null);
            setProyectoIdParaDetalle(null);
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
              <th className="py-3 px-4 text-left font-semibold text-gray-700">Cliente</th>
              <th className="py-3 px-4 text-left font-semibold text-gray-700">Ciudad</th>
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
                          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
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