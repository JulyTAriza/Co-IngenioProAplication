"use client";

import React, { useMemo, useState, useEffect } from "react";
import Header from "@/app/(components)/Header";
import {
  useGetProyectosQuery,
  useGetReporteEtapasQuery,
  useGetReporteAvancesQuery,
  useGetReporteMaterialesQuery,
  useGetReporteClientesQuery,
  ReporteAvanceEtapa,
} from "@/state/api";
import { skipToken } from "@reduxjs/toolkit/query";
import * as XLSX from "xlsx";
import { Download, BarChart3, Users, Package, AlertCircle, RefreshCw } from "lucide-react";

// Datos de prueba temporalmente
const datosMaterialesPrueba = [
  { id: 1, nombre: "Cemento", categoria: "Construcción", cantidad: 150, unidad: "kg", proveedor: "Cemex" },
  { id: 2, nombre: "Ladrillos", categoria: "Construcción", cantidad: 5000, unidad: "unidades", proveedor: "Ladrillera Santa Fe" },
  { id: 3, nombre: "Pintura Blanca", categoria: "Acabados", cantidad: 80, unidad: "galones", proveedor: "Comex" },
  { id: 4, nombre: "Tubería PVC", categoria: "Plomería", cantidad: 200, unidad: "metros", proveedor: "Durman" },
];

const datosClientesPrueba = [
  { id: 1, nombre: "Constructora ABC", contacto: "Juan Pérez", telefono: "3001234567", email: "juan@constructoraabc.com", estado: "Activo" },
  { id: 2, nombre: "Inmobiliaria XYZ", contacto: "María García", telefono: "3017654321", email: "maria@inmobiliariaxyz.com", estado: "Activo" },
  { id: 3, nombre: "Desarrolladora Norte", contacto: "Carlos Rodríguez", telefono: "3029876543", email: "carlos@desarrolladora.com", estado: "Inactivo" },
];

const SimpleReportes = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [selectedEtapaId, setSelectedEtapaId] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [usarDatosPrueba, setUsarDatosPrueba] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // --- QUERIES PRINCIPALES ---
  const { 
    data: proyectos = [], 
    isLoading: loadingProyectos,
    error: errorProyectos 
  } = useGetProyectosQuery({});

  const { 
    data: etapas = [], 
    isLoading: loadingEtapas,
    error: errorEtapas 
  } = useGetReporteEtapasQuery(
    selectedProjectId !== "" ? Number(selectedProjectId) : skipToken
  );

  const { 
    data: avances = [], 
    isLoading: loadingAvances,
    error: errorAvances 
  } = useGetReporteAvancesQuery(
    selectedEtapaId !== "" ? Number(selectedEtapaId) : skipToken
  );

  // --- QUERIES PARA REPORTES EXTRA ---
  const { 
    data: repMateriales, 
    isLoading: loadingMateriales,
    error: errorMateriales,
    refetch: refetchMateriales 
  } = useGetReporteMaterialesQuery();

  const { 
    data: repClientes, 
    isLoading: loadingClientes,
    error: errorClientes,
    refetch: refetchClientes 
  } = useGetReporteClientesQuery();

  // --- USAR DATOS REALES O DE PRUEBA ---
  const materialesData = usarDatosPrueba ? datosMaterialesPrueba : repMateriales;
  const clientesData = usarDatosPrueba ? datosClientesPrueba : repClientes;
  const hayError = errorMateriales || errorClientes;

  // --- DEBUG EN CONSOLA ---
  useEffect(() => {
    console.log("=== DEBUG REPORTES ===");
    console.log("Usando datos de prueba:", usarDatosPrueba);
    console.log("Materiales reales:", repMateriales);
    console.log("Clientes reales:", repClientes);
    console.log("Error materiales:", errorMateriales);
    console.log("Error clientes:", errorClientes);
    console.log("======================");
  }, [repMateriales, repClientes, errorMateriales, errorClientes, usarDatosPrueba]);

  // --- FILTRO AVANCES ---
  const filteredAvances = useMemo(() => {
    const list = (avances ?? []) as ReporteAvanceEtapa[];
    if (!startDate && !endDate) return list;
    return list.filter((a) => {
      const fecha = a.fecha ? new Date(a.fecha).toISOString().split('T')[0] : '';
      const afterStart = !startDate || fecha >= startDate;
      const beforeEnd = !endDate || fecha <= endDate;
      return afterStart && beforeEnd;
    });
  }, [avances, startDate, endDate]);

  // --- FUNCIÓN DESCARGAR EXCEL ---
  const downloadExcel = (data: any[], fileName: string) => {
    try {
      if (!data || data.length === 0) {
        alert("No hay datos para descargar.");
        return;
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "Reporte");
      XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
      
    } catch (error) {
      console.error("Error al descargar Excel:", error);
      alert("Error al generar el archivo Excel.");
    }
  };

  // --- MANEJADORES DE DESCARGA ---
  const handleDownloadAvances = () => {
    if (filteredAvances.length === 0) {
      alert("No hay datos de avances para descargar.");
      return;
    }
    
    const rows = filteredAvances.map((a) => ({
      Fecha: a.fecha ? new Date(a.fecha).toLocaleDateString('es-ES') : '',
      Descripción: a.descripcion || "Sin descripción",
      'Porcentaje Avance': a.porcentaje_avance || 0,
    }));
    
    downloadExcel(rows, "reporte_avances");
  };

  const handleDownloadMateriales = () => {
    if (!materialesData || materialesData.length === 0) {
      alert("No hay datos de materiales para descargar.");
      return;
    }

    downloadExcel(materialesData, "reporte_materiales");
  };

  const handleDownloadClientes = () => {
    if (!clientesData || clientesData.length === 0) {
      alert("No hay datos de clientes para descargar.");
      return;
    }

    downloadExcel(clientesData, "reporte_clientes");
  };

  // --- FORZAR REFETCH ---
  const handleForceRefresh = () => {
    refetchMateriales();
    refetchClientes();
  };

  // --- ESTADÍSTICAS RÁPIDAS ---
  const stats = [
    {
      title: "Avances",
      value: filteredAvances.length,
      icon: BarChart3,
      color: "bg-blue-500",
      onClick: handleDownloadAvances,
      disabled: filteredAvances.length === 0,
      loading: loadingAvances
    },
    {
      title: "Materiales",
      value: materialesData?.length || 0,
      icon: Package,
      color: "bg-purple-500",
      onClick: handleDownloadMateriales,
      disabled: loadingMateriales || !materialesData || materialesData.length === 0,
      loading: loadingMateriales,
      usandoPrueba: usarDatosPrueba
    },
    {
      title: "Clientes",
      value: clientesData?.length || 0,
      icon: Users,
      color: "bg-orange-500",
      onClick: handleDownloadClientes,
      disabled: loadingClientes || !clientesData || clientesData.length === 0,
      loading: loadingClientes,
      usandoPrueba: usarDatosPrueba
    }
  ];

  if (!isClient) {
    return <div className="min-h-screen bg-gray-50 p-6">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Header name="Reportes del Sistema" />

        {/* BOTONES DE CONTROL */}
        <div className="mb-4 flex justify-between items-center">
          <div className="flex gap-2">
            {hayError && (
              <button
                onClick={() => setUsarDatosPrueba(!usarDatosPrueba)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                  usarDatosPrueba 
                    ? "bg-green-600 text-white" 
                    : "bg-yellow-500 text-white"
                }`}
              >
                <AlertCircle size={16} />
                {usarDatosPrueba ? "Usando Datos de Prueba" : "Usar Datos de Prueba"}
              </button>
            )}
          </div>
          
          <button
            onClick={handleForceRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <RefreshCw size={16} />
            Recargar Datos
          </button>
        </div>

        {/* ESTADÍSTICAS RÁPIDAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    {stat.title}
                    {stat.usandoPrueba && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Prueba
                      </span>
                    )}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {stat.loading ? "..." : stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="text-white" size={24} />
                </div>
              </div>
              <button 
                onClick={stat.onClick}
                disabled={stat.disabled}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  stat.disabled
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                    : "bg-gray-800 hover:bg-gray-900 text-white shadow hover:shadow-md"
                }`}
              >
                {stat.loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Cargando...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Descargar Excel
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* INFORMACIÓN DEL ESTADO */}
        {hayError && !usarDatosPrueba && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-semibold mb-2 flex items-center gap-2">
              <AlertCircle size={16} />
              Problema de Conexión
            </h3>
            <div className="text-sm text-red-700 space-y-1">
              <p>• No se pueden cargar los datos desde el servidor</p>
              <p className="mt-2">
                <button 
                  onClick={() => setUsarDatosPrueba(true)}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Usar datos de prueba para continuar
                </button>
              </p>
            </div>
          </div>
        )}

        {usarDatosPrueba && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="text-yellow-800 font-semibold mb-2">
              ⚠️ Usando Datos de Prueba
            </h3>
            <p className="text-sm text-yellow-700">
              Estás viendo datos de demostración. Para ver los datos reales, soluciona el problema de conexión con el servidor.
            </p>
          </div>
        )}

        {/* FILTROS PARA AVANCES */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Filtros para Avances de Proyectos</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Proyecto</label>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value ? Number(e.target.value) : "");
                  setSelectedEtapaId("");
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar proyecto</option>
                {proyectos.map((p: any) => (
                  <option key={p.id_proyecto} value={p.id_proyecto}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Etapa</label>
              <select
                value={selectedEtapaId}
                onChange={(e) => setSelectedEtapaId(e.target.value ? Number(e.target.value) : "")}
                disabled={!selectedProjectId}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="">Seleccionar etapa</option>
                {etapas.map((et: any) => (
                  <option key={et.id_etapa} value={et.id_etapa}>
                    {et.nombre_etapa}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {filteredAvances.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>{filteredAvances.length}</strong> registros de avance encontrados.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleReportes;