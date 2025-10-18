"use client";

import { useState } from "react";
import { PlusCircle, Search, Pencil, Trash2 } from "lucide-react";
import ConfirmDialog from "@/app/(components)/ConfirmDialog/page";
import Header from "@/app/(components)/Header";
import CreateProjectModal from "./CreateProjectModal";
import {
  useGetProyectosQuery,
  useCreateProyectoMutation,
  useUpdateProyectoMutation,
  useDeleteProyectoMutation,
} from "@/state/api";

export interface ProyectoResumen {
  id_proyecto: number;
  nombre: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin?: string;
  presupuesto?: number;
}

const ProjectsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProyecto, setSelectedProyecto] = useState<ProyectoResumen | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [proyectoToDelete, setProyectoToDelete] = useState<number | null>(null);

  const { data: proyectos, isLoading, isError } = useGetProyectosQuery({});
  const [createProyecto] = useCreateProyectoMutation();
  const [updateProyecto] = useUpdateProyectoMutation();
  const [deleteProyecto] = useDeleteProyectoMutation();

const handleCreateProyecto = async (proyectoData: any) => {
  try {
    if (selectedProyecto) {
      await updateProyecto({
        id: selectedProyecto.id_proyecto,
        data: proyectoData,
      }).unwrap();
      setSelectedProyecto(null);
    } else {
      await createProyecto(proyectoData).unwrap();
    }
    setIsModalOpen(false);
  } catch (err) {
    console.error("Error al crear/editar proyecto:", err);
    alert("No se pudo crear el proyecto. Revisa los campos.");
  }
};


  const handleEdit = (proyecto: ProyectoResumen) => {
    setSelectedProyecto(proyecto);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setProyectoToDelete(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (proyectoToDelete !== null) {
      await deleteProyecto(proyectoToDelete);
    }
    setProyectoToDelete(null);
    setConfirmOpen(false);
  };

  if (isLoading) return <div className="py-4">Cargando...</div>;
  if (isError || !proyectos) {
    return <div className="text-center text-red-500 py-4">Error al cargar proyectos</div>;
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
          className="w-full py-2 px-4 rounded bg-white"
          placeholder="Buscar Proyectos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <Header name="Proyectos" />
        <button
          className="flex items-center bg-blue-500 hover:bg-blue-700 text-gray-200 font-bold py-2 px-4 rounded"
          onClick={() => {
            setSelectedProyecto(null);
            setIsModalOpen(true);
          }}
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Crear Proyecto
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="py-3 px-4 text-left">Nombre</th>
              <th className="py-3 px-4 text-left">Estado</th>
              <th className="py-3 px-4 text-left">Inicio</th>
              <th className="py-3 px-4 text-left">Fin</th>
              <th className="py-3 px-4 text-left">Presupuesto</th>
              <th className="py-3 px-4 text-center">Operación</th>
            </tr>
          </thead>
          <tbody>
            {filteredProyectos.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-4 text-gray-500">
                  No se encontraron proyectos
                </td>
              </tr>
            ) : (
              filteredProyectos.map((proyecto) => (
                <tr key={proyecto.id_proyecto} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{proyecto.nombre}</td>
                  <td className="py-3 px-4">{proyecto.estado}</td>
                  <td className="py-3 px-4">{proyecto.fecha_inicio}</td>
                  <td className="py-3 px-4">{proyecto.fecha_fin || "—"}</td>
                  <td className="py-3 px-4">
                    {proyecto.presupuesto ? `$${proyecto.presupuesto.toFixed(2)}` : "—"}
                  </td>
                  <td className="py-3 px-4 flex justify-center gap-3">
                    <button
                      className="text-blue-500 hover:text-blue-700"
                      onClick={() => handleEdit(proyecto)}
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteClick(proyecto.id_proyecto)}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
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
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProyecto(null);
        }}
        onCreate={handleCreateProyecto}
        proyecto={selectedProyecto}
      />

      {/* CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Eliminar proyecto"
        message="¿Estás seguro de que quieres eliminar este proyecto?"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </div>
  );
};

export default ProjectsPage;