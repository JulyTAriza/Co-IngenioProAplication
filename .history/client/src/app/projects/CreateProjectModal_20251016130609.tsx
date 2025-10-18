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
  onDelete?: (proyectoId: number) => Promise<void>;
  proyecto: any | null;
  showToast?: (message: string, type?: 'success' | 'error') => void; // Nueva prop para mensajes toast
}

interface FormErrors {
  [key: string]: string;
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
  onDelete,
  proyecto,
  showToast,
}: CreateProjectModalProps) {
  const { data: clients = [] } = useGetClientsQuery();
  const { data: cities = [] } = useGetCitiesQuery();
  const { data: usuarios = [] } = useGetUsersQuery();
  const { data: materials = [] } = useGetMaterialsQuery();
  
  const [equipo, setEquipo] = useState<ProyectoEquipo[]>([]);
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    setErrors({});
    setShowDeleteConfirm(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (proyecto) {
      console.log("🔄 Cargando proyecto para editar:", proyecto);
      
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
      setEquipo(proyecto.equipo || []);
      
    } else {
      resetForm();
    }
  }, [proyecto, cities, clients, isOpen, resetForm]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validaciones básicas
    if (!formData.nombre.trim()) newErrors.nombre = "El nombre del proyecto es requerido";
    if (!formData.fecha_inicio) newErrors.fecha_inicio = "La fecha de inicio es requerida";
    
    // Validaciones para creación
    if (!proyecto) {
      if (!formData.nombre_ciudad.trim()) newErrors.ciudad = "La ciudad es requerida";
      if (!formData.departamento.trim()) newErrors.departamento = "El departamento es requerido";
      if (!formData.nombre_cliente.trim()) newErrors.nombre_cliente = "El nombre del cliente es requerido";
      if (!formData.email_cliente.trim()) newErrors.email_cliente = "El email del cliente es requerido";
      if (!formData.telefono_cliente.trim()) newErrors.telefono_cliente = "El teléfono del cliente es requerido";
      if (!formData.direccion_cliente.trim()) newErrors.direccion_cliente = "La dirección del cliente es requerida";
    }

    // Validaciones para ambos casos
    if (equipo.length === 0) {
      newErrors.equipo = "Debe haber al menos un miembro en el equipo";
    } else {
      const miembrosSinRol = equipo.filter(m => !m.rol || m.rol.trim() === "");
      if (miembrosSinRol.length > 0) {
        newErrors.equipo = "Todos los miembros del equipo deben tener un rol asignado";
      }
    }

    if (formData.materiales.length === 0) {
      newErrors.materiales = "Debe haber al menos un material";
    }

    // Validar fechas
    if (formData.fecha_fin && formData.fecha_inicio > formData.fecha_fin) {
      newErrors.fecha_fin = "La fecha de fin no puede ser anterior a la fecha de inicio";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const showMessage = (message: string, type: 'success' | 'error' = 'success') => {
    if (showToast) {
      showToast(message, type);
    } else {
      // Fallback si no hay sistema de toast
      if (type === 'success') {
        alert(`✅ ${message}`);
      } else {
        alert(`❌ ${message}`);
      }
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      const errorMessages = Object.values(errors).join('\n');
      showMessage(`Por favor corrige los siguientes errores:\n${errorMessages}`, 'error');
      return;
    }

    const presupuestoNum = formData.presupuesto ? Number(formData.presupuesto) : null;

    try {
      setIsLoading(true);

      let payload: any;

      if (proyecto) {
        // EDITAR - Usar IDs existentes
        payload = {
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim() || "",
          id_ciudad: formData.id_ciudad,
          id_cliente: formData.id_cliente,
          fecha_inicio: formData.fecha_inicio,
          fecha_fin: formData.fecha_fin || null,
          estado: formData.estado,
          presupuesto: presupuestoNum,
          equipo: equipo,
          materiales: formData.materiales.map(mat => ({
            id_material: mat.id_material,
            cantidad: Number(mat.cantidad),
            unidad: mat.unidad,
            costo_unitario: Number(mat.costo_unitario),
            nombre_etapa: mat.nombre_etapa || ""
          }))
        };
      } else {
        // CREAR - ESTRUCTURA CORREGIDA
        payload = {
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim() || "",
          nombre_ciudad: formData.nombre_ciudad.trim(),
          departamento: formData.departamento.trim(),
          nombre_cliente: formData.nombre_cliente.trim(),
          email_cliente: formData.email_cliente.trim(),
          telefono_cliente: formData.telefono_cliente.trim(),
          direccion_cliente: formData.direccion_cliente.trim(),
          fecha_inicio: formData.fecha_inicio,
          fecha_fin: formData.fecha_fin || null,
          presupuesto: presupuestoNum,
          equipo: equipo.map(member => ({
            id_usuario: member.id_usuario,
            id_estado: member.id_estado || 1,
            rol: member.rol.trim()
          })),
          materiales: formData.materiales.map(mat => ({
            id_material: mat.id_material,
            cantidad: Number(mat.cantidad),
            unidad: mat.unidad,
            costo_unitario: Number(mat.costo_unitario),
            nombre_etapa: mat.nombre_etapa || ""
          }))
        };
      }

      console.log("📤 Enviando payload CORREGIDO:", JSON.stringify(payload, null, 2));
      
      await onCreate(payload);
      
      // Mostrar mensaje de éxito
      showMessage(
        proyecto 
          ? "✅ Proyecto actualizado exitosamente" 
          : "✅ Proyecto creado exitosamente"
      );
      
      resetForm();
      onClose();
      
    } catch (err: any) {
      console.error("Error al crear/editar proyecto:", err);
      const errorMessage = err.response?.data?.message || err.message || "Error desconocido al procesar el proyecto";
      showMessage(errorMessage, 'error');
      setErrors({ submit: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!proyecto || !onDelete) return;

    try {
      setIsLoading(true);
      await onDelete(proyecto.id_proyecto);
      
      // Mostrar mensaje de éxito
      showMessage("🗑️ Proyecto eliminado exitosamente");
      
      setShowDeleteConfirm(false);
      resetForm();
      onClose();
    } catch (err: any) {
      console.error("Error al eliminar proyecto:", err);
      const errorMessage = err.response?.data?.message || err.message || "Error al eliminar el proyecto";
      showMessage(errorMessage, 'error');
      setErrors({ submit: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const labelCss = "block text-sm font-medium text-gray-700 mb-1";
  const sectionTitleCss = "col-span-2 mt-6 mb-3 text-lg font-semibold text-gray-800 border-b-2 border-gray-200 pb-2";
  const inputCss = "block w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors";
  const errorCss = "text-red-500 text-xs mt-1";

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">
              {proyecto ? "Editar Proyecto" : "Crear Nuevo Proyecto"}
            </h2>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showDeleteConfirm ? (
            // Modal de confirmación de eliminación
            <div className="text-center py-8">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                ¿Estás seguro de eliminar este proyecto?
              </h3>
              <p className="text-gray-600 mb-6">
                El proyecto "<span className="font-semibold">{proyecto?.nombre}</span>" será marcado como <span className="font-semibold text-red-600">"Eliminado"</span> 
                y ya no aparecerá en la lista principal, pero se mantendrá en el historial.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Eliminando...
                    </>
                  ) : (
                    "Sí, Eliminar Proyecto"
                  )}
                </button>
              </div>
            </div>
          ) : (
            // Formulario normal
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Detalles del Proyecto */}
              <div className="grid grid-cols-2 gap-4">
                <h3 className={sectionTitleCss}>Detalles del Proyecto</h3>
                
                <div className="col-span-2 md:col-span-1">
                  <label className={labelCss}>Nombre del Proyecto *</label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    className={`${inputCss} ${errors.nombre ? 'border-red-500' : ''}`}
                    placeholder="Ingrese el nombre del proyecto"
                  />
                  {errors.nombre && <div className={errorCss}>{errors.nombre}</div>}
                </div>

                {proyecto && (
                  <div className="col-span-2 md:col-span-1">
                    <label className={labelCss}>Estado</label>
                    <select
                      name="estado"
                      value={formData.estado}
                      onChange={handleChange}
                      className={inputCss}
                    >
                      <option value="Planificación">Planificación</option>
                      <option value="En Progreso">En Progreso</option>
                      <option value="Completado">Completado</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Información del Cliente */}
              <div className="grid grid-cols-2 gap-4">
                <h3 className={sectionTitleCss}>Información del Cliente</h3>
                
                <div className={proyecto ? "col-span-2 md:col-span-1" : "col-span-2"}>
                  <label className={labelCss}>Cliente *</label>
                  {proyecto ? (
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
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          error={!!errors.nombre_cliente}
                          helperText={errors.nombre_cliente}
                        />
                      )}
                      isOptionEqualToValue={(option, value) => {
                        if (!value || !value.id) return false;
                        return Number(option.id) === Number(value.id);
                      }}
                    />
                  ) : (
                    <>
                      <input
                        type="text"
                        name="nombre_cliente"
                        value={formData.nombre_cliente}
                        onChange={handleChange}
                        className={`${inputCss} ${errors.nombre_cliente ? 'border-red-500' : ''}`}
                        placeholder="Nombre del cliente"
                      />
                      {errors.nombre_cliente && <div className={errorCss}>{errors.nombre_cliente}</div>}
                    </>
                  )}
                </div>

                {!proyecto && (
                  <>
                    <div className="col-span-2 md:col-span-1">
                      <label className={labelCss}>Email Cliente *</label>
                      <input
                        type="email"
                        name="email_cliente"
                        value={formData.email_cliente}
                        onChange={handleChange}
                        className={`${inputCss} ${errors.email_cliente ? 'border-red-500' : ''}`}
                        placeholder="email@cliente.com"
                      />
                      {errors.email_cliente && <div className={errorCss}>{errors.email_cliente}</div>}
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className={labelCss}>Teléfono Cliente *</label>
                      <input
                        type="text"
                        name="telefono_cliente"
                        value={formData.telefono_cliente}
                        onChange={handleChange}
                        className={`${inputCss} ${errors.telefono_cliente ? 'border-red-500' : ''}`}
                        placeholder="+57 300 123 4567"
                      />
                      {errors.telefono_cliente && <div className={errorCss}>{errors.telefono_cliente}</div>}
                    </div>
                    <div className="col-span-2">
                      <label className={labelCss}>Dirección Cliente *</label>
                      <input
                        type="text"
                        name="direccion_cliente"
                        value={formData.direccion_cliente}
                        onChange={handleChange}
                        className={`${inputCss} ${errors.direccion_cliente ? 'border-red-500' : ''}`}
                        placeholder="Dirección completa del cliente"
                      />
                      {errors.direccion_cliente && <div className={errorCss}>{errors.direccion_cliente}</div>}
                    </div>
                  </>
                )}
              </div>

              {/* Ubicación */}
              <div className="grid grid-cols-2 gap-4">
                <h3 className={sectionTitleCss}>Ubicación</h3>
                
                <div className="col-span-2">
                  <label className={labelCss}>Ciudad *</label>
                  {proyecto ? (
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
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          error={!!errors.ciudad}
                          helperText={errors.ciudad}
                        />
                      )}
                      isOptionEqualToValue={(option, value) => option.id === value?.id}
                    />
                  ) : (
                    <Autocomplete
                      options={cities}
                      getOptionLabel={(option) => `${option.nombre} (${option.departamento})`}
                      value={cities.find((c) => c.nombre === formData.nombre_ciudad && c.departamento === formData.departamento) || null}
                      onChange={(_, newValue) =>
                        setFormData((prev) => ({
                          ...prev,
                          nombre_ciudad: newValue ? newValue.nombre : "",
                          departamento: newValue ? newValue.departamento : ""
                        }))
                      }
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          error={!!errors.ciudad}
                          helperText={errors.ciudad}
                        />
                      )}
                      isOptionEqualToValue={(option, value) => 
                        option.nombre === value?.nombre && option.departamento === value?.departamento
                      }
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
                      className={`${inputCss} ${errors.departamento ? 'border-red-500' : ''}`}
                    />
                    {errors.departamento && <div className={errorCss}>{errors.departamento}</div>}
                  </div>
                )}

                <div className="col-span-2">
                  <label className={labelCss}>Descripción</label>
                  <textarea
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleChange}
                    className={`${inputCss} resize-none`}
                    rows={3}
                    placeholder="Descripción detallada del proyecto..."
                  />
                </div>
              </div>

              {/* Materiales */}
              <div className="grid grid-cols-1 gap-4">
                <h3 className={sectionTitleCss}>Materiales *</h3>
                
                <div>
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
                      <TextField 
                        {...params} 
                        placeholder="Selecciona materiales" 
                        error={!!errors.materiales}
                        helperText={errors.materiales}
                      />
                    )}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                  />

                  {formData.materiales.length > 0 && (
                    <div className="mt-4 bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-6 gap-3 font-semibold text-sm text-gray-700 mb-3">
                        <span className="col-span-2">Material</span>
                        <span>Cantidad</span>
                        <span>Unidad</span>
                        <span>Costo Unit.</span>
                        <span>Etapa</span>
                        <span>Acción</span>
                      </div>
                      {formData.materiales.map((mat, idx) => {
                        const material = materials.find(m => m.id === mat.id_material);
                        return (
                          <div key={idx} className="grid grid-cols-6 gap-3 mb-3 items-center">
                            <span className="col-span-2 font-medium">{material?.nombre}</span>
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
                              className={`${inputCss} text-sm py-2`}
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
                              className={`${inputCss} text-sm py-2`}
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
                              className={`${inputCss} text-sm py-2`}
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
                              className={`${inputCss} text-sm py-2`}
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
                              className="text-red-600 hover:text-red-800 font-bold text-lg"
                              title="Eliminar material"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Fechas y Presupuesto */}
              <div className="grid grid-cols-3 gap-4">
                <h3 className={sectionTitleCss}>Planificación</h3>
                
                <div>
                  <label className={labelCss}>Fecha Inicio *</label>
                  <input
                    type="date"
                    name="fecha_inicio"
                    value={formData.fecha_inicio}
                    onChange={handleChange}
                    className={`${inputCss} ${errors.fecha_inicio ? 'border-red-500' : ''}`}
                  />
                  {errors.fecha_inicio && <div className={errorCss}>{errors.fecha_inicio}</div>}
                </div>
                
                <div>
                  <label className={labelCss}>Fecha Fin</label>
                  <input
                    type="date"
                    name="fecha_fin"
                    value={formData.fecha_fin}
                    onChange={handleChange}
                    className={`${inputCss} ${errors.fecha_fin ? 'border-red-500' : ''}`}
                  />
                  {errors.fecha_fin && <div className={errorCss}>{errors.fecha_fin}</div>}
                </div>
                
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
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Equipo del Proyecto */}
              <div className="grid grid-cols-1 gap-4">
                <h3 className={sectionTitleCss}>Equipo del Proyecto *</h3>
                
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="Buscar usuario por nombre..."
                    className={inputCss}
                    value={filtroUsuario}
                    onChange={(e) => setFiltroUsuario(e.target.value)}
                  />
                  {errors.equipo && <div className={errorCss}>{errors.equipo}</div>}
                </div>
                
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                  {usuarios
                    .filter((u) =>
                      u.username.toLowerCase().includes(filtroUsuario.toLowerCase())
                    )
                    .map((usuario) => {
                      const miembro = equipo.find((e) => e.id_usuario === usuario.id);
                      const estaSeleccionado = Boolean(miembro);

                      return (
                        <div key={usuario.id} className="flex items-center gap-4 p-3 border-b border-gray-100 hover:bg-blue-50 transition-colors">
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
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="flex-1 font-medium text-gray-800">{usuario.username}</span>
                          <div className="w-48">
                            <select
                              className={`${inputCss} text-sm py-2 ${!estaSeleccionado ? 'bg-gray-100 text-gray-400' : ''}`}
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
                              <option value="Arquitecto">Arquitecto</option>
                              <option value="Diseñador">Diseñador</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Errores generales */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="text-red-600 font-semibold">Error:</div>
                    <div className="text-red-600 ml-2">{errors.submit}</div>
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                {/* Botón de eliminar solo para edición */}
                {proyecto && onDelete && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isLoading}
                    className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Eliminar Proyecto
                  </button>
                )}

                <div className="flex gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    disabled={isLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 ${
                      isLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {proyecto ? "Guardando..." : "Creando..."}
                      </>
                    ) : (
                      proyecto ? "Guardar Cambios" : "Crear Proyecto"
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}