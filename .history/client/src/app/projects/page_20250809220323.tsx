"use client";

import { useState } from "react";
import { PlusCircle, Search, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import ConfirmDialog from "@/app/(components)/ConfirmDialog/page";
import Header from "@/app/(components)/Header";
import CreateMaterialModal from "./CreateProjectModal";
import {
  useGetMaterialsQuery,
  useCreateMaterialMutation,
  useUpdateMaterialMutation,
  useDeleteMaterialMutation,
} from "@/state/api";

export interface Material {
  id: number;
  nombre: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
}

const MaterialsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<number | null>(null);

  const { data: materials, isLoading, isError } = useGetMaterialsQuery();
  const [createMaterial] = useCreateMaterialMutation();
  const [updateMaterial] = useUpdateMaterialMutation();
  const [deleteMaterial] = useDeleteMaterialMutation();

  const handleCreateMaterial = async (materialData: Omit<Material, "id">) => {
    if (selectedMaterial) {
      await updateMaterial({ id: selectedMaterial.id, data: materialData });
      setSelectedMaterial(null);
    } else {
      await createMaterial(materialData);
    }
    setIsModalOpen(false);
  };

  const handleEdit = (material: Material) => {
    setSelectedMaterial(material);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setMaterialToDelete(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (materialToDelete !== null) {
      await deleteMaterial(materialToDelete);
    }
    setMaterialToDelete(null);
    setConfirmOpen(false);
  };

  if (isLoading) return <div className="py-4">Cargando...</div>;
  if (isError || !materials) {
    return <div className="text-center text-red-500 py-4">Failed to fetch projects</div>;
  }

  const filteredMaterials = materials.filter((m: Material) =>
    m.nombre.toLowerCase().includes(searchTerm.toLowerCase())
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
            setSelectedMaterial(null);
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
              <th className="py-3 px-4 text-left">Icono</th>
              <th className="py-3 px-4 text-left">Nombre</th>
              <th className="py-3 px-4 text-left">Precio</th>
              <th className="py-3 px-4 text-left">Stock</th>
              <th className="py-3 px-4 text-center">Operación</th>
            </tr>
          </thead>
          <tbody>
            {filteredMaterials.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-4 text-gray-500">
                  No materials found
                </td>
              </tr>
            ) : (
              filteredMaterials.map((material) => (
                <tr key={material.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <Image
                      src={`https://s3-inventorymanagement.s3.us-east-2.amazonaws.com/product${Math.floor(Math.random() * 3) + 1}.png`}
                      alt={material.nombre}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  </td>
                  <td className="py-3 px-4">{material.nombre}</td>
                  <td className="py-3 px-4">${material.precio_unitario.toFixed(2)}</td>
                  <td className="py-3 px-4">{material.cantidad}</td>
                  <td className="py-3 px-4 flex justify-center gap-3">
                    <button
                      className="text-blue-500 hover:text-blue-700"
                      onClick={() => handleEdit(material)}
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteClick(material.id)}
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
      <CreateMaterialModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedMaterial(null);
        }}
        onCreate={handleCreateMaterial}
        material={selectedMaterial}
      />

      {/* CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Eliminar material"
        message="¿Estás seguro de que quieres eliminar este material?"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </div>
  );
};

export default ProjectsPage;