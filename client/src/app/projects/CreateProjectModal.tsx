"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import Header from "@/app/(components)/Header";
import { ProyectoResumen } from "@/app/projects/page";
import { Autocomplete, TextField, Chip } from "@mui/material";
import type { ProyectoEquipo } from "@/state/api";
import { useGetProyectoDetalleQuery } from "@/state/api";
import {
  useGetClientsQuery,
  useGetCitiesQuery,
  useGetMaterialsQuery,
  useGetUsersQuery
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
  materiales: {
    id_material: number;
    cantidad: number;
    unidad: string;
    costo_unitario: number;
    nombre_etapa?: string;
  }[];
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
  const { data: usuarios = [] } = useGetUsersQuery();
  const [equipo, setEquipo] = useState<ProyectoEquipo[]>([]);
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const { data: proyectoDetalle, isLoading: loadingDetalle } = useGetProyectoDetalleQuery(proyecto?.id_proyecto!, {
  skip: !proyecto,
});

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
  if (proyectoDetalle) {
    setFormData({
      nombre: proyectoDetalle.nombre ?? "",
      descripcion: proyectoDetalle.descripcion ?? "",
      nombre_ciudad: proyectoDetalle.nombre_ciudad ?? "",
      departamento: proyectoDetalle.departamento ?? "",
      nombre_cliente: proyectoDetalle.nombre_cliente ?? "",
      email_cliente: proyectoDetalle.email_cliente ?? "",
      telefono_cliente: proyectoDetalle.telefono_cliente ?? "",
      direccion_cliente: proyectoDetalle.direccion_cliente ?? "",
      fecha_inicio: proyectoDetalle.fecha_inicio ?? "",
      fecha_fin: proyectoDetalle.fecha_fin ?? "",
      presupuesto: proyectoDetalle.presupuesto?.toString() ?? "",
      materiales: proyectoDetalle.materiales ?? [],
    });
    setEquipo(proyectoDetalle.equipo ?? []);
  }
}, [proyectoDetalle]);


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

if (
  !formData.nombre.trim() ||
  !formData.fecha_inicio ||
  !formData.nombre_ciudad.trim() ||
  !formData.nombre_cliente.trim() ||
  equipo.length === 0 ||
  formData.materiales.length === 0
) {
  alert("Por favor completa todos los campos obligatorios: nombre, fecha de inicio, ciudad, cliente, equipo y materiales.");
  return;
}


    try {
      setIsLoading(true);
      setIsError(false);

      const payload = {
        ...formData,
        presupuesto: presupuestoNum,
        equipo,
      };

      console.log("Enviando proyecto:", JSON.stringify(payload, null, 2)); // Para validar que coincide con Postman
      await onCreate(payload);
      onClose();
} catch (err: any) {
if (err.response) {
  console.error(" Error al crear/editar proyecto - status:", err.response.status);
  console.error(" Respuesta del servidor:", err.response.data);
} else {
  console.error(" Error inesperado:", err);
}

    alert("No se pudo crear el proyecto. Revisa los campos.");
} finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const labelCss = "block text-sm font-medium text-gray-700 mb-1";
  const sectionTitleCss =
    "col-span-2 mt-4 mb-2 text-base font-semibold text-gray-800 border-b pb-1";
  const inputCss =
    "block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500";

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-20 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-[700px] p-6 relative max-h-[90vh] overflow-y-auto">
        <Header name={proyecto ? "Edit Project" : "Crear Nuevo Proyecto"} />

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

{/* Cliente */}
<div>
  <label className={labelCss}>Clientes</label>
  <Autocomplete
    options={clients}
    getOptionLabel={(option) => option.nombre}
    value={clients.find((c) => c.nombre === formData.nombre_cliente) || null}
    onChange={(_, newValue) =>
      setFormData((prev) => ({
        ...prev,
        nombre_cliente: newValue?.nombre || "",
        email_cliente: newValue?.email || "",
        telefono_cliente: newValue?.telefono || "",
        direccion_cliente: newValue?.direccion || ""
      }))
    }
    renderInput={(params) => <TextField {...params} />}
  />
</div>

{/* Campos del cliente */}
<div>
  <label className={labelCss}>Email Cliente</label>
  <input
    type="email"
    name="email_cliente"
    value={formData.email_cliente}
    onChange={handleChange}
    className={inputCss}
    required
  />
</div>
<div>
  <label className={labelCss}>Teléfono Cliente</label>
  <input
    type="text"
    name="telefono_cliente"
    value={formData.telefono_cliente}
    onChange={handleChange}
    className={inputCss}
    required
  />
</div>
<div className="col-span-2">
  <label className={labelCss}>Dirección Cliente</label>
  <input
    type="text"
    name="direccion_cliente"
    value={formData.direccion_cliente}
    onChange={handleChange}
    className={inputCss}
    required
  />
</div>

{/* Ubicación */}
<h3 className={sectionTitleCss}>Ubicación</h3>
<div>
  <label className={labelCss}>Ciudad</label>
  <Autocomplete
    options={cities}
    getOptionLabel={(option) => `${option.nombre} (${option.departamento})`}
    value={cities.find((c) => c.nombre === formData.nombre_ciudad) || null}
    onChange={(_, newValue) =>
      setFormData((prev) => ({
        ...prev,
        nombre_ciudad: newValue?.nombre || "",
        departamento: newValue?.departamento || ""
      }))
    }
    renderInput={(params) => <TextField {...params} />}
  />
</div>
<div>
  <label className={labelCss}>Departamento</label>
  <input
    type="text"
    name="departamento"
    value={formData.departamento}
    onChange={handleChange}
    className={inputCss}
    required
  />
</div>

{/* Descripción */}
<div className="col-span-2">
  <label className={labelCss}>Descripción</label>
  <textarea
    name="descripcion"
    value={formData.descripcion}
    onChange={(e) =>
      setFormData((prev) => ({ ...prev, descripcion: e.target.value }))
    }
    className={inputCss}
    rows={2}
    required
  />
</div>

{/* Materiales */}
<h3 className={sectionTitleCss}>Materiales</h3>
<div className="col-span-2">
  <Autocomplete
    multiple
    options={materials}
    getOptionLabel={(option) => option.nombre}
    value={materials.filter((m) =>
      formData.materiales.some((fm) => fm.id_material === m.id)
    )}
    onChange={(_, newValue) =>
      setFormData((prev) => ({
        ...prev,
        materiales: newValue.map((m) => ({
          id_material: m.id,
          cantidad: 1,
          unidad: "unidades",
          costo_unitario: m.precio_unitario || 0,
          nombre_etapa: ""
        }))
      }))
    }
    renderTags={(value, getTagProps) =>
      value.map((option, index) => {
        const { key, ...rest } = getTagProps({ index });
        return <Chip key={key} label={option.nombre} {...rest} />;
      })
    }
    renderInput={(params) => (
      <TextField {...params} placeholder="Selecciona materiales" />
    )}
  />

  {/* Tabla editable de materiales */}
  {formData.materiales.length > 0 && (
    <div className="mt-4">
      <div className="grid grid-cols-5 gap-2 font-semibold text-sm text-gray-700 mb-2">
        <span>Cantidad</span>
        <span>Unidad</span>
        <span>Costo Unitario</span>
        <span>Etapa</span>
        <span></span>
      </div>
      {formData.materiales.map((mat, idx) => (
        <div key={idx} className="grid grid-cols-5 gap-2 mb-2">
          <input
            type="number"
            value={mat.cantidad}
            onChange={(e) => {
              const cantidad = Number(e.target.value);
              setFormData((prev) => {
                const mats = [...prev.materiales];
                mats[idx].cantidad = cantidad;
                return { ...prev, materiales: mats };
              });
            }}
            className={inputCss}
          />
          <select
            value={mat.unidad}
            onChange={(e) => {
              const unidad = e.target.value;
              setFormData((prev) => {
                const mats = [...prev.materiales];
                mats[idx].unidad = unidad;
                return { ...prev, materiales: mats };
              });
            }}
            className={inputCss}
          >
            <option value="unidades">Unidades</option>
            <option value="kg">Kilogramos</option>
            <option value="m">Metros</option>
            <option value="l">Litros</option>
          </select>
          <input
            type="number"
            value={mat.costo_unitario}
            onChange={(e) => {
              const costo = Number(e.target.value);
              setFormData((prev) => {
                const mats = [...prev.materiales];
                mats[idx].costo_unitario = costo;
                return { ...prev, materiales: mats };
              });
            }}
            className={inputCss}
          />
          <select
            value={mat.nombre_etapa}
            onChange={(e) => {
              const etapa = e.target.value;
              setFormData((prev) => {
                const mats = [...prev.materiales];
                mats[idx].nombre_etapa = etapa;
                return { ...prev, materiales: mats };
              });
            }}
            className={inputCss}
          >
            <option value="">Seleccionar etapa</option>
            <option value="Preparación">Preparación</option>
            <option value="Ejecución">Ejecución</option>
            <option value="Finalización">Finalización</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setFormData((prev) => ({
                ...prev,
                materiales: prev.materiales.filter((_, i) => i !== idx)
              }));
            }}
            className="text-red-600"
          >
            X
          </button>
        </div>
      ))}
    </div>
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

          {/* Equipo */}
          <h3 className={sectionTitleCss}>Equipo del Proyecto</h3>
          <div className="col-span-2 mb-2">
            <input
              type="text"
              placeholder="Buscar usuario..."
              className={inputCss}
              value={filtroUsuario}
              onChange={(e) => setFiltroUsuario(e.target.value)}
            />
          </div>
          <div className="col-span-2 max-h-[300px] overflow-y-auto space-y-2 border p-2 rounded">
            {usuarios
              .filter((u) =>
                u.username.toLowerCase().includes(filtroUsuario.toLowerCase())
              )
              .map((usuario) => {
                const miembro = equipo.find((e) => e.id_usuario === usuario.id);
                const estaSeleccionado = Boolean(miembro);

                return (
                  <div key={usuario.id} className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={estaSeleccionado}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEquipo((prev) => [
                            ...prev,
                            { id_usuario: usuario.id, id_estado: 1, rol: "" },
                          ]);
                        } else {
                          setEquipo((prev) =>
                            prev.filter((e) => e.id_usuario !== usuario.id)
                          );
                        }
                      }}
                    />
                    <span className="w-1/3">{usuario.username}</span>
                    <div className="w-1/2">
                      <select
                        className={`${inputCss} w-full`}
                        disabled={!estaSeleccionado}
                        value={miembro?.rol || ""}
                        onChange={(e) => {
                          const nuevoRol = e.target.value;
                          setEquipo((prev) =>
                            prev.map((e) =>
                              e.id_usuario === usuario.id
                                ? { ...e, rol: nuevoRol }
                                : e
                            )
                          );
                        }}
                      >
                        <option value="">Seleccionar rol</option>
                        <option value="Ingeniero">Ingeniero</option>
                        <option value="Supervisor">Supervisor</option>
                        <option value="Obrero">Obrero</option>
                        <option value="Jefe de Proyecto">Jefe de Proyecto</option>
                      </select>
                    </div>
                  </div>
                );
              })}
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
