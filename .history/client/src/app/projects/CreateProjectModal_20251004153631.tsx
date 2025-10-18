"use client";

import { useState, useEffect, ChangeEvent, FormEvent, useCallback } from "react";
import Header from "@/app/(components)/Header";
import { Autocomplete, TextField, Chip } from "@mui/material";
import type { ProyectoEquipo } from "@/state/api";
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
  id_ciudad: number | null;
  nombre_cliente: string;
  email_cliente: string;
  telefono_cliente: string;
  direccion_cliente: string;
  id_cliente: number | null;
  fecha_inicio: string;
  fecha_fin: string;
  presupuesto: string;
  estado: string;
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
  proyecto: any | null;
}

const initialFormData: FormData = {
  nombre: "",
  descripcion: "",
  nombre_ciudad: "",
  departamento: "",
  id_ciudad: null,
  nombre_cliente: "",
  email_cliente: "",
  telefono_cliente: "",
  direccion_cliente: "",
  id_cliente: null,
  fecha_inicio: "",
  fecha_fin: "",
  presupuesto: "",
  estado: "Planificación",
  materiales: [],
};

export default function CreateProjectModal({
  isOpen,
  onClose,
  onCreate,
  proyecto,
}: CreateProjectModalProps) {
  const { data: clients = [] } = useGetClientsQuery();
  const { data: cities = [] } = useGetCitiesQuery();
  const { data: usuarios = [] } = useGetUsersQuery();
  const { data: materials = [] } = useGetMaterialsQuery();
  
  const [equipo, setEquipo] = useState<ProyectoEquipo[]>([]);
  const [filtroUsuario, setFiltroUsuario] = useState("");

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return "";
    }
  };

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setEquipo([]);
    setFiltroUsuario("");
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (proyecto) {
      console.log("🔄 Cargando proyecto para editar:", proyecto);
      
      // CORREGIDO: Cargar todos los datos del proyecto incluyendo relaciones
      const ciudad = cities.find(c => c.id === proyecto.id_ciudad);
      const cliente = clients.find(c => Number(c.id) === proyecto.id_cliente);

      setFormData({
        nombre: proyecto.nombre || "",
        descripcion: proyecto.descripcion || "",
        nombre_ciudad: proyecto.nombre_ciudad || (ciudad ? ciudad.nombre : ""),
        departamento: proyecto.departamento || (ciudad ? ciudad.departamento : ""),
        id_ciudad: proyecto.id_ciudad || null,
        nombre_cliente: proyecto.nombre_cliente || (cliente ? cliente.nombre : ""),
        email_cliente: proyecto.email_cliente || (cliente ? cliente.email : "") || "",
        telefono_cliente: proyecto.telefono_cliente || (cliente ? cliente.telefono : "") || "",
        direccion_cliente: proyecto.direccion_cliente || (cliente ? cliente.direccion : "") || "",
        id_cliente: proyecto.id_cliente || null,
        fecha_inicio: formatDateForInput(proyecto.fecha_inicio),
        fecha_fin: formatDateForInput(proyecto.fecha_fin),
        presupuesto: String(proyecto.presupuesto !== null && proyecto.presupuesto !== undefined ? proyecto.presupuesto : ""),
        estado: proyecto.estado || "Planificación",
        materiales: proyecto.materiales || [],
      });

      // CORREGIDO: Cargar equipo si existe
      setEquipo(proyecto.equipo || []);
      
      console.log("✅ FormData cargado:", {
        nombre: proyecto.nombre,
        cliente: proyecto.nombre_cliente,
        ciudad: proyecto.nombre_ciudad,
        equipo: proyecto.equipo
      });

    } else {
      resetForm();
    }
  }, [proyecto, cities, clients, isOpen, resetForm]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validaciones
    const presupuestoNum = formData.presupuesto ? Number(formData.presupuesto) : null;
    
    const errors = [];
    if (!formData.nombre.trim()) errors.push("Nombre del proyecto");
    if (!formData.fecha_inicio) errors.push("Fecha de inicio");
    if (!proyecto && !formData.nombre_ciudad.trim()) errors.push("Ciudad");
    if (!proyecto && !formData.nombre_cliente.trim()) errors.push("Cliente");
    if (equipo.length === 0) errors.push("Equipo (debe tener al menos un miembro)");
    if (formData.materiales.length === 0) errors.push("Materiales (debe tener al menos uno)");

    // Validar roles en equipo
    const miembrosSinRol = equipo.filter(m => !m.rol || m.rol.trim() === "");
    if (miembrosSinRol.length > 0) {
      errors.push("Todos los miembros del equipo deben tener un rol asignado");
    }

    if (errors.length > 0) {
      alert(`Por favor completa los siguientes campos obligatorios:\n• ${errors.join('\n• ')}`);
      return;
    }

    try {
      setIsLoading(true);
      setIsError(false);

      let payload: any;

      if (proyecto) {
        // PAYLOAD PARA EDITAR - CORREGIDO
        payload = {
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim(),
          id_ciudad: formData.id_ciudad,
          id_cliente: formData.id_cliente,
          fecha_inicio: formData.fecha_inicio,
          fecha_fin: formData.fecha_fin || null,
          estado: formData.estado,
          presupuesto: presupuestoNum,
          equipo: equipo,
          materiales: formData.materiales
        };
      } else {
        // PAYLOAD PARA CREAR - CORREGIDO
        payload = {
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim(),
          nombre_ciudad: formData.nombre_ciudad.trim(),
          departamento: formData.departamento.trim(),
          nombre_cliente: formData.nombre_cliente.trim(),
          email_cliente: formData.email_cliente.trim(),
          telefono_cliente: formData.telefono_cliente.trim(),
          direccion_cliente: formData.direccion_cliente.trim(),
          fecha_inicio: formData.fecha_inicio,
          fecha_fin: formData.fecha_fin || null,
          presupuesto: presupuestoNum,
          equipo: equipo,
          materiales: formData.materiales
        };
      }

      console.log("📤 Enviando payload:", JSON.stringify(payload, null, 2));
      
      // Validar que el JSON sea válido
      try {
        JSON.stringify(payload);
      } catch (jsonError) {
        console.error("❌ Error en JSON:", jsonError);
        throw new Error("Los datos del proyecto contienen valores no válidos");
      }

      await onCreate(payload);
      
      resetForm();
      onClose();
    } catch (err: any) {
      console.error("Error al crear/editar proyecto:", err);
      alert("No se pudo procesar el proyecto. Revisa los campos.");
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const labelCss = "block text-sm font-medium text-gray-700 mb-1";
  const sectionTitleCss = "col-span-2 mt-4 mb-2 text-base font-semibold text-gray-800 border-b pb-1";
  const inputCss = "block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500";

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-20 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-[700px] p-6 relative max-h-[90vh] overflow-y-auto">
        <Header name={proyecto ? "Editar Proyecto" : "Crear Nuevo Proyecto"} />

        <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-2 gap-4">
          <h3 className={sectionTitleCss}>Detalles del Proyecto</h3>
          <div>
            <label className={labelCss}>Nombre del Proyecto *</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className={inputCss}
              required
            />
          </div>

          {proyecto && (
            <div>
              <label className={labelCss}>Estado</label>
              <select
                name="estado"
                value={formData.estado}
                onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
                className={inputCss}
              >
                <option value="Planificación">Planificación</option>
                <option value="En Progreso">En Progreso</option>
                <option value="Completado">Completado</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
          )}

          <div className={proyecto ? "" : "col-span-2"}>
            <label className={labelCss}>Cliente *</label>
            {proyecto ? (
              // Para editar: mostrar selección de cliente existente
              <Autocomplete
                options={clients}
                getOptionLabel={(option) => option.nombre}
                value={clients.find((c) => Number(c.id) === formData.id_cliente) || null}
                onChange={(_, newValue) =>
                  setFormData((prev) => ({
                    ...prev,
                    id_cliente: newValue ? Number(newValue.id) : null,
                    nombre_cliente: newValue ? newValue.nombre : "",
                  }))
                }
                renderInput={(params) => <TextField {...params} />}
                isOptionEqualToValue={(option, value) => {
                  if (!value || !value.id) return false;
                  return Number(option.id) === Number(value.id);
                }}
              />
            ) : (
              // Para crear: input simple
              <input
                type="text"
                name="nombre_cliente"
                value={formData.nombre_cliente}
                onChange={handleChange}
                className={inputCss}
                required
              />
            )}
          </div>

          {!proyecto && (
            <>
              <div>
                <label className={labelCss}>Email Cliente *</label>
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
                <label className={labelCss}>Teléfono Cliente *</label>
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
                <label className={labelCss}>Dirección Cliente *</label>
                <input
                  type="text"
                  name="direccion_cliente"
                  value={formData.direccion_cliente}
                  onChange={handleChange}
                  className={inputCss}
                  required
                />
              </div>
            </>
          )}

          <h3 className={sectionTitleCss}>Ubicación</h3>
          <div className="col-span-2">
            <label className={labelCss}>Ciudad *</label>
            {proyecto ? (
              // Para editar: selección de ciudad existente
              <Autocomplete
                options={cities}
                getOptionLabel={(option) => `${option.nombre} (${option.departamento})`}
                value={cities.find((c) => c.id === formData.id_ciudad) || null}
                onChange={(_, newValue) =>
                  setFormData((prev) => ({
                    ...prev,
                    id_ciudad: newValue ? newValue.id : null,
                    nombre_ciudad: newValue ? newValue.nombre : "",
                    departamento: newValue ? newValue.departamento : ""
                  }))
                }
                renderInput={(params) => <TextField {...params} />}
                isOptionEqualToValue={(option, value) => option.id === value?.id}
              />
            ) : (
              // Para crear: input simple
              <input
                type="text"
                name="nombre_ciudad"
                value={formData.nombre_ciudad}
                onChange={handleChange}
                className={inputCss}
                required
              />
            )}
          </div>

          {!proyecto && (
            <div className="col-span-2">
              <label className={labelCss}>Departamento *</label>
              <input
                type="text"
                name="departamento"
                value={formData.departamento}
                onChange={handleChange}
                className={inputCss}
                required
              />
            </div>
          )}

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
            />
          </div>

          <h3 className={sectionTitleCss}>Materiales *</h3>
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
                  materiales: newValue.map((m) => {
                    const existing = prev.materiales.find(mat => mat.id_material === m.id);
                    return existing || {
                      id_material: m.id,
                      cantidad: 1,
                      unidad: "unidades",
                      costo_unitario: m.precio_unitario || 0,
                      nombre_etapa: ""
                    };
                  })
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
              isOptionEqualToValue={(option, value) => option.id === value.id}
            />

            {formData.materiales.length > 0 && (
              <div className="mt-4">
                <div className="grid grid-cols-5 gap-2 font-semibold text-sm text-gray-700 mb-2">
                  <span>Cantidad</span>
                  <span>Unidad</span>
                  <span>Costo Unit.</span>
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
                      min="1"
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
                      min="0"
                      step="0.01"
                    />
                    <select
                      value={mat.nombre_etapa || ""}
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
                      <option value="">Sin etapa</option>
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
                      className="text-red-600 hover:text-red-800"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <h3 className={sectionTitleCss}>Fechas</h3>
          <div>
            <label className={labelCss}>Fecha Inicio *</label>
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

          <h3 className={sectionTitleCss}>Presupuesto</h3>
          <div>
            <label className={labelCss}>Presupuesto</label>
            <input
              type="number"
              name="presupuesto"
              value={formData.presupuesto}
              onChange={handleChange}
              className={inputCss}
              min="0"
              step="0.01"
            />
          </div>

          <h3 className={sectionTitleCss}>Equipo del Proyecto *</h3>
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
                  <div key={usuario.id} className="flex items-center gap-4 p-2 hover:bg-gray-50 rounded">
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
                      className="w-4 h-4"
                    />
                    <span className="w-1/3 font-medium">{usuario.username}</span>
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
                        required={estaSeleccionado}
                      >
                        <option value="">Seleccionar rol *</option>
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

          <div className="col-span-2 flex justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 mr-2 bg-gray-500 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 transition-colors ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isLoading
                ? proyecto ? "Guardando..." : "Creando..."
                : proyecto ? "Guardar Cambios" : "Crear Proyecto"}
            </button>
          </div>

          {isError && (
            <p className="text-red-600 mt-3 col-span-2 text-center">
              Ocurrió un error. Por favor intenta de nuevo.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}