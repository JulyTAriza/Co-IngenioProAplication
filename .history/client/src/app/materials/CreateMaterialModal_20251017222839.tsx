"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import Header from "@/app/(components)/Header";

interface FormData {
  nombre: string;
  descripcion: string;
  cantidad: string;         // string para evitar NaN en inputs
  precio_unitario: string;  // string para evitar NaN en inputs
}

type CreateMaterialModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (materialData: {
    nombre: string;
    descripcion: string;
    cantidad: number;
    precio_unitario: number;
  }) => Promise<void>;
  material: any | null; // null = crear, objeto = editar
};

export default function CreateMaterialModal({
  isOpen,
  onClose,
  onCreate,
  material,
}: CreateMaterialModalProps) {
  const [formData, setFormData] = useState<FormData>({
    nombre: "",
    descripcion: "",
    cantidad: "",
    precio_unitario: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  // Si estamos editando, precargar datos
  useEffect(() => {
    if (material) {
      setFormData({
        nombre: material.nombre || "",
        descripcion: material.descripcion || "",
        cantidad: String(material.cantidad ?? ""),
        precio_unitario: String(material.precio_unitario ?? ""),
      });
    } else {
      setFormData({
        nombre: "",
        descripcion: "",
        cantidad: "",
        precio_unitario: "",
      });
    }
  }, [material]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const cantidadNum = Number(formData.cantidad);
    const precioNum = Number(formData.precio_unitario);

    if (
      !formData.nombre.trim() ||
      !formData.descripcion.trim() ||
      isNaN(cantidadNum) ||
      isNaN(precioNum)
    ) {
      alert("Completa todos los campos con valores válidos");
      return;
    }

    try {
      setIsLoading(true);
      setIsError(false);

      await onCreate({
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim(),
        cantidad: cantidadNum,
        precio_unitario: precioNum,
      });

      onClose();
    } catch (err) {
      console.error("Error creando/editando material:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const labelCss =
    "block text-sm font-medium text-gray-700 mb-1";
  const inputCss =
    "block w-full p-2 mb-4 border-2 border-gray-300 rounded-md focus:outline-none focus:border-blue-500";

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-20 flex items-center justify-center">
      <div className="bg-white rounded-md shadow-lg w-96 p-6 relative">
        <Header name={material ? "Editar Material" : "Crear Nuevo Material"} />

        <form onSubmit={handleSubmit} className="mt-4">
          {/* Nombre */}
          <label htmlFor="nombre" className={labelCss}>
            Nombre
          </label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            placeholder="Nombre"
            value={formData.nombre}
            onChange={handleChange}
            className={inputCss}
            required
          />

          {/* Descripción */}
          <label htmlFor="descripcion" className={labelCss}>
            Descripción
          </label>
          <input
            type="text"
            id="descripcion"
            name="descripcion"
            placeholder="Descripción"
            value={formData.descripcion}
            onChange={handleChange}
            className={inputCss}
            required
          />

          {/* Cantidad */}
          <label htmlFor="cantidad" className={labelCss}>
            Cantidad
          </label>
          <input
            type="number"
            id="cantidad"
            name="cantidad"
            placeholder="Cantidad"
            value={formData.cantidad}
            onChange={handleChange}
            className={inputCss}
            min="0"
            step="1"
            required
          />

          {/* Precio Unitario */}
          <label htmlFor="precio_unitario" className={labelCss}>
            Precio Unitario
          </label>
          <input
            type="number"
            id="precio_unitario"
            name="precio_unitario"
            placeholder="Precio Unitario"
            value={formData.precio_unitario}
            onChange={handleChange}
            className={inputCss}
            min="0"
            step="any"
            required
          />

          {/* Botones */}
          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 mr-2 bg-gray-500 text-white rounded hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isLoading
                ? material
                  ? "Guardando..."
                  : "Creando..."
                : material
                ? "Guardar Cambios"
                : "Crear"}
            </button>
          </div>

          {isError && (
            <p className="text-red-600 mt-3">
              Ocurrió un error. Intenta de nuevo.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
