"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import Header from "@/app/(components)/Header";
import { ProyectoResumen } from "@/app/projects/page";

interface FormData {
  nombre: string;
  descripcion: string;
  nombre_ciudad: string;
  departamento: string;
  nombre_cliente: string;
  email_cliente: string;
  telefono_cliente: string;
  direccion_cliente: string;
  fecha_inicio: string;
  fecha_fin: string;
  presupuesto: string;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (proyectoData: any) => Promise<void>;
  proyecto: ProyectoResumen | null;
}

export default function CreateProjectModal({
  isOpen,
  onClose,
  onCreate,
  proyecto,
}: CreateProjectModalProps) {
  const [formData, setFormData] = useState<FormData>({
    nombre: "",
    descripcion: "",
    nombre_ciudad: "",
    departamento: "",
    nombre_cliente: "",
    email_cliente: "",
    telefono_cliente: "",
    direccion_cliente: "",
    fecha_inicio: "",
    fecha_fin: "",
    presupuesto: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (proyecto) {
      setFormData({
        nombre: proyecto.nombre || "",
        descripcion: "",
        nombre_ciudad: "",
        departamento: "",
        nombre_cliente: "",
        email_cliente: "",
        telefono_cliente: "",
        direccion_cliente: "",
        fecha_inicio: proyecto.fecha_inicio || "",
        fecha_fin: proyecto.fecha_fin || "",
        presupuesto: proyecto.presupuesto?.toString() || "",
      });
    } else {
      setFormData({
        nombre: "",
        descripcion: "",
        nombre_ciudad: "",
        departamento: "",
        nombre_cliente: "",
        email_cliente: "",
        telefono_cliente: "",
        direccion_cliente: "",
        fecha_inicio: "",
        fecha_fin: "",
        presupuesto: "",
      });
    }
  }, [proyecto]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const presupuestoNum = Number(formData.presupuesto);

    if (!formData.nombre.trim() || isNaN(presupuestoNum)) {
      alert("Completa todos los campos obligatorios con valores válidos");
      return;
    }

    try {
      setIsLoading(true);
      setIsError(false);

      await onCreate({
        ...formData,
        presupuesto: presupuestoNum,
        equipo: [], // puedes agregar lógica para capturar equipo
        materiales: [], // puedes agregar lógica para capturar materiales
      });

      onClose();
    } catch (err) {
      console.error("Error creando/editando proyecto:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const labelCss = "block text-sm font-medium text-gray-700 mb-1";
  const inputCss = "block w-full p-2 mb-4 border-2 border-gray-300 rounded-md focus:outline-none focus:border-blue-500";

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-20 flex items-center justify-center">
      <div className="bg-white rounded-md shadow-lg w-[600px] p-6 relative">
        <Header name={proyecto ? "Editar Proyecto" : "Crear Nuevo Proyecto"} />

        <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-2 gap-4">
          {Object.entries(formData).map(([key, value]) => (
            <div key={key} className="col-span-1">
              <label htmlFor={key} className={labelCss}>
                {key.replace("_", " ").toUpperCase()}
              </label>
              <input
                type={key.includes("fecha") ? "date" : key === "presupuesto" ? "number" : "text"}
                id={key}
                name={key}
                value={value}
                onChange={handleChange}
                className={inputCss}
                required={["nombre", "nombre_ciudad", "nombre_cliente", "fecha_inicio"].includes(key)}
              />
            </div>
          ))}

          <div className="col-span-2 flex justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 mr-2 bg-gray-500 text-white rounded hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isLoading
                ? proyecto
                  ? "Guardando..."
                  : "Creando..."
                : proyecto
                ? "Guardar Cambios"
                : "Crear"}
            </button>
          </div>

          {isError && (
            <p className="text-red-600 mt-3 col-span-2">
              Ocurrió un error. Intenta de nuevo.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
