"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import Header from "@/app/(components)/Header";
import { ProyectoResumen } from "@/app/projects/page"; // deja como lo tienes
import { Autocomplete, TextField, Chip } from "@mui/material";
import type { ProyectoEquipo } from "@/state/api";
import {
  useGetClientsQuery,
  useGetCitiesQuery,
  useGetMaterialsQuery,
  useGetUsersQuery
} from "@/state/api";

interface MaterialForm {
  id_material: number;
  cantidad: number;
  unidad: string;
  costo_unitario: number;
  nombre_etapa?: string;
}

interface FormData {
  id_cliente: number | string | null;
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
  materiales: MaterialForm[];
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

  const {
    data: materials = [],
    isLoading: isLoadingMaterials,
    isError: isErrorMaterials,
  } = useGetMaterialsQuery();

  const [formData, setFormData] = useState<FormData>({
    id_cliente: null,
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

  // ---------- CARGAR DATOS AL EDITAR ----------
  useEffect(() => {
    if (proyecto) {
      // ----> casteo local para evitar errores si el objeto que llega no coincide 100% con el tipo
      const p = proyecto as unknown as any;

      setFormData({
        id_cliente: p.id_cliente ?? null,
        nombre: p.nombre ?? "",
        descripcion: p.descripcion ?? "",
        nombre_ciudad: p.nombre_ciudad ?? "",
        departamento: p.departamento ?? "",
        nombre_cliente: p.nombre_cliente ?? "",
        email_cliente: p.email_cliente ? String(p.email_cliente) : "",
        telefono_cliente: p.telefono_cliente ? String(p.telefono_cliente) : "",
        direccion_cliente: p.direccion_cliente ? String(p.direccion_cliente) : "",
        fecha_inicio: p.fecha_inicio ?? "",
        fecha_fin: p.fecha_fin ?? "",
        presupuesto: p.presupuesto?.toString() ?? "",
        materiales: (p.materiales?.map((m: any) => ({
          id_material: Number(m.id_material),
          cantidad: Number(m.cantidad ?? 1),
          unidad: m.unidad ?? "unidades",
          costo_unitario: Number(m.costo_unitario ?? 0),
          nombre_etapa: m.nombre_etapa ?? "",
        })) as MaterialForm[]) ?? [],
      } as FormData);

      setEquipo((p.equipo ?? []) as ProyectoEquipo[]);
    } else {
      // reset para creación
      setFormData({
        id_cliente: null,
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
      setEquipo([]);
    }
  }, [proyecto]);

  // acepta input y textarea — actualiza el campo dinamicamente de forma tipo-segura
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      // forzamos el tipo de la clave para que TypeScript acepte la asignación dinámica
      [name as keyof FormData]: value,
    } as FormData));
  };

  // ---------- SUBMIT ----------
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const presupuestoNum = Number(formData.presupuesto);

    if (!formData.nombre.trim() || isNaN(presupuestoNum)) {
      alert("Por favor completa todos los campos requeridos con valores válidos");
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

      console.log("Payload enviado:", payload);
      await onCreate(payload);
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
              getOptionLabel={(option: any) => option.nombre}
              value={
                clients.find((c: any) => String(c.id) === String(formData.id_cliente)) || null
              }
              onChange={(_, newValue) => {
                const client = newValue as any;
                setFormData((prev) => ({
                  ...prev,
                  id_cliente: client?.id ?? null,
                  nombre_cliente: client?.nombre ?? "",
                  email_cliente: client?.email ? String(client.email) : "",
                  telefono_cliente: client?.telefono ? String(client.telefono) : "",
                  direccion_cliente: client?.direccion ? String(client.direccion) : "",
                } as FormData));
              }}
              renderInput={(params) => <TextField {...params} />}
            />
          </div>

          {/* Campos del cliente (visibles y editables) */}
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
              getOptionLabel={(option: any) => `${option.nombre} (${option.departamento})`}
              value={cities.find((c: any) => c.nombre === formData.nombre_ciudad) || null}
              onChange={(_, newValue) =>
                setFormData((prev) => ({
                  ...prev,
                  nombre_ciudad: newValue?.nombre ?? "",
                  departamento: newValue?.departamento ?? "",
                } as FormData))
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
              onChange={handleChange}
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
              getOptionLabel={(option: any) => option.nombre}
              value={materials.filter((m: any) =>
                formData.materiales.some((fm) => fm.id_material === m.id)
              )}
              onChange={(_, newValue) =>
                setFormData((prev) => ({
                  ...prev,
                  materiales: newValue.map((m: any) => ({
                    id_material: Number(m.id),
                    cantidad: 1,
                    unidad: "unidades",
                    costo_unitario: Number(m.precio_unitario ?? 0),
                    nombre_etapa: "",
                  })) as MaterialForm[],
                } as FormData))
              }
              renderTags={(value, getTagProps) =>
                value.map((option: any, index: number) => {
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
                          return { ...prev, materiales: mats } as FormData;
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
                          return { ...prev, materiales: mats } as FormData;
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
                          return { ...prev, materiales: mats } as FormData;
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
                          return { ...prev, materiales: mats } as FormData;
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
                          materiales: prev.materiales.filter((_, i) => i !== idx),
                        } as FormData));
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
                              e.id_usuario === usuario.id ? { ...e, rol: nuevoRol } : e
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
              {isLoading ? (proyecto ? "Saving..." : "Creating...") : proyecto ? "Save Changes" : "Create"}
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
