"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import Header from "@/app/(components)/Header";
import { ProyectoResumen } from "@/app/projects/page";
import { Autocomplete, TextField, Chip } from "@mui/material";
import {
  useGetClientsQuery,
  useGetCitiesQuery,
  useGetMaterialsQuery,
} from "@/state/api";

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
  materiales: string[];
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
  const { data: clients = [] } = useGetClientsQuery();
  const { data: cities = [] } = useGetCitiesQuery();
  const {
    data: materials = [],
    isLoading: isLoadingMaterials,
    isError: isErrorMaterials,
  } = useGetMaterialsQuery();

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
    materiales: [],
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
        materiales: [],
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
        materiales: [],
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
      alert("Please complete all required fields with valid values");
      return;
    }

    try {
      setIsLoading(true);
      setIsError(false);

      await onCreate({
        ...formData,
        presupuesto: presupuestoNum,
      });

      onClose();
    } catch (err) {
      console.error("Error creating/editing project:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const labelCss = "block text-sm font-medium text-gray-700 mb-1";
  const sectionTitleCss = "col-span-2 mt-4 mb-2 text-base font-semibold text-gray-800 border-b pb-1";
  const inputCss =
    "block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500";

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-20 flex items-center justify-center">
      <div
  className="bg-white rounded-lg shadow-lg w-[700px] p-6 relative max-h-[90vh] overflow-y-auto"
>

        <Header name={proyecto ? "Edit Project" : "Create New Project"} />

        <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-2 gap-4">
          
          {/* Datos del Proyecto */}
          <h3 className={sectionTitleCss}>Detalles del Proyecto</h3>
          <div>
            <label className={labelCss}>Nombre del Proyecto</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className={inputCss}
              required
            />
          </div>
          <div>
            <label className={labelCss}>Clientes</label>
            <Autocomplete
              options={clients}
              getOptionLabel={(option) => option.name}
              value={
                clients.find((c) => c.name === formData.nombre_cliente) || null
              }
              onChange={(_, newValue) =>
                setFormData((prev) => ({
                  ...prev,
                  nombre_cliente: newValue?.name || "",
                }))
              }
              renderInput={(params) => <TextField {...params} />}
            />
          </div>

          {/* Ubicación */}
          <h3 className={sectionTitleCss}>Ubicación</h3>
          <div>
            <label className={labelCss}>Ciudad</label>
            <Autocomplete
              options={cities}
              getOptionLabel={(option) =>
                `${option.name} (${option.department})`
              }
              value={
                cities.find((c) => c.name === formData.nombre_ciudad) || null
              }
              onChange={(_, newValue) =>
                setFormData((prev) => ({
                  ...prev,
                  nombre_ciudad: newValue?.name || "",
                  departamento: newValue?.department || "",
                }))
              }
              renderInput={(params) => <TextField {...params} />}
            />
          </div>

          {/* Materiales */}
          <h3 className={sectionTitleCss}>Materiales</h3>
          <div className="col-span-2">
            {isLoadingMaterials && (
              <div className="py-2 text-gray-500">Cargando materiales...</div>
            )}
            {isErrorMaterials && (
              <div className="py-2 text-red-500">
                Error al cargar materiales.
              </div>
            )}
            {!isLoadingMaterials && !isErrorMaterials && (
              <Autocomplete
                multiple
                options={materials}
                getOptionLabel={(option) => option.nombre}
                value={materials.filter((m) =>
                  formData.materiales.includes(m.nombre)
                )}
                onChange={(_, newValue) =>
                  setFormData((prev) => ({
                    ...prev,
                    materiales: newValue.map((m) => m.nombre),
                  }))
                }
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip label={option.nombre} {...getTagProps({ index })} />
                  ))
                }
                renderInput={(params) => (
                  <TextField {...params} placeholder="Selecciona materiales" />
                )}
              />
            )}
          </div>

          {/* Fechas */}
          <h3 className={sectionTitleCss}>Fechas</h3>
          <div>
            <label className={labelCss}>Fecha Inicio</label>
            <input
              type="date"
              name="fecha_inicio"
              value={formData.fecha_inicio}
              onChange={handleChange}
              className={inputCss}
              required
            />
          </div>
          <div>
            <label className={labelCss}>Fecha Fin</label>
            <input
              type="date"
              name="fecha_fin"
              value={formData.fecha_fin}
              onChange={handleChange}
              className={inputCss}
            />
          </div>

          {/* Presupuesto */}
          <h3 className={sectionTitleCss}>Presupuesto</h3>
          <div>
            <label className={labelCss}>Presupuesto</label>
            <input
              type="number"
              name="presupuesto"
              value={formData.presupuesto}
              onChange={handleChange}
              className={inputCss}
            />
          </div>

          {/* Botones */}
          <div className="col-span-2 flex justify-end mt-6">
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
                ? proyecto
                  ? "Saving..."
                  : "Creating..."
                : proyecto
                ? "Save Changes"
                : "Create"}
            </button>
          </div>

          {isError && (
            <p className="text-red-600 mt-3 col-span-2">
              An error occurred. Please try again.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
