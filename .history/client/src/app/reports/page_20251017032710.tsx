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

const SimpleReportes = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [selectedEtapaId, setSelectedEtapaId] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // QUERIES con manejo mejorado
  const { 
    data: proyectos = [], 
    isLoading: loadingProyectos,
    error: errorProyectos,
    refetch: refetchProyectos
  } = useGetProyectosQuery({});

  const { 
    data: etapas = [], 
    isLoading: loadingEtapas,
    error: errorEtapas,
    refetch: refetchEtapas
  } = useGetReporteEtapasQuery(
    selectedProjectId !== "" ? Number(selectedProjectId) : skipToken
  );

  const { 
    data: avances = [], 
    isLoading: loadingAvances,
    error: errorAvances,
    refetch: refetchAvances
  } = useGetReporteAvancesQuery(
    selectedEtapaId !== "" ? Number(selectedEtapaId) : skipToken
  );

  const { 
    data: repMateriales = [], 
    isLoading: loadingMateriales,
    error: errorMateriales,
    refetch: refetchMateriales 
  } = useGetReporteMaterialesQuery(undefined, {
    refetchOnMountOrArgChange: true,
    skip: false // Asegurar que siempre se ejecute
  });

  const { 
    data: repClientes = [], 
    isLoading: loadingClientes,
    error: errorClientes,
    refetch: refetchClientes 
  } = useGetReporteClientesQuery(undefined, {
    refetchOnMountOrArgChange: true,
    skip: false // Asegurar que siempre se ejecute
  });

  // DEBUG mejorado
  useEffect(() => {
    console.log("=== DEBUG REPORTES ===");
    console.log("Proyectos:", proyectos);
    console.log("Materiales:", repMateriales);
    console.log("Clientes:", repClientes);
    console.log("Error materiales:", errorMateriales);
    console.log("Error clientes:", errorClientes);
    console.log("======================");
  }, [proyectos, repMateriales, repClientes, errorMateriales, errorClientes]);

  // Formatear fecha
  const formatDisplayDate = (value?: string | null) => {
    if (!value) return "";
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return value || "";
    }
  };

  // Filtrar avances
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

  // Función de descarga Excel MEJORADA
  const downloadExcel = (data: any[], fileName: string) => {
    try {
      console.log("Descargando:", fileName, "Datos:", data);
      
      if (!data || data.length === 0) {
        alert("No hay datos para descargar.");
        return;
      }

      // Crear workbook
      const wb = XLSX.utils.book_new();
      
      // Convertir datos a worksheet
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Agregar al workbook
      XLSX.utils.book_append_sheet(wb, ws, "Reporte");
      
      // Descargar
      XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
      
    } catch (error) {
      console.error("Error al descargar Excel:", error);
      alert("Error al generar el archivo Excel: " + (error as Error).message);
    }
  };

  // Manejadores de descarga MEJORADOS


  const handleDownloadMateriales = () => {
    if (loadingMateriales) {
      alert("Cargando materiales, por favor espera...");
      return;
    }

    if (errorMateriales) {
      alert("Error al cargar materiales: " + JSON.stringify(errorMateriales));
      return;
    }

    if (!repMateriales || repMateriales.length === 0) {
      alert("No hay datos de materiales para descargar.");
      return;
    }

    downloadExcel(repMateriales, "reporte_materiales");
  };

  const handleDownloadClientes = () => {
    if (loadingClientes) {
      alert("Cargando clientes, por favor espera...");
      return;
    }

    if (errorClientes) {
      alert("Error al cargar clientes: " + JSON.stringify(errorClientes));
      return;
    }

    if (!repClientes || repClientes.length === 0) {
      alert("No hay datos de clientes para descargar.");
      return;
    }

    downloadExcel(repClientes, "reporte_clientes");
  };

  // Forzar refresh de todos los datos
  const handleForceRefresh = () => {
    console.log("Forzando refresh completo...");
    refetchProyectos();
    refetchMateriales();
    refetchClientes();
    if (selectedProjectId) refetchEtapas();
    if (selectedEtapaId) refetchAvances();
  };

  // Estadísticas
  const stats = [
    {
      title: "Materiales",
      value: repMateriales?.length || 0,
      icon: Package,
      color: "bg-purple-500",
      onClick: handleDownloadMateriales,
      disabled: loadingMateriales || !repMateriales || repMateriales.length === 0,
      loading: loadingMateriales,
      error: errorMateriales
    },
    {
      title: "Clientes",
      value: repClientes?.length || 0,
      icon: Users,
      color: "bg-orange-500",
      onClick: handleDownloadClientes,
      disabled: loadingClientes || !repClientes || repClientes.length === 0,
      loading: loadingClientes,
      error: errorClientes
    }
  ];

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Header name="Reportes del Sistema" />
          <div className="text-center py-8">Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Header name="Reportes del Sistema" />

        {/* BOTÓN DE REFRESH */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={handleForceRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
          >
            <RefreshCw size={16} />
            Recargar Todos los Datos
          </button>
        </div>

        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {stat.loading ? "..." : stat.value}
                  </p>
                  {stat.loading && (
                    <p className="text-xs text-gray-500 mt-1">Cargando...</p>
                  )}
                  {stat.error && (
                    <p className="text-xs text-red-500 mt-1">Error al cargar</p>
                  )}
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

        {/* PANEL DE DEBUG MEJORADO */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="text-yellow-800 font-semibold mb-2 flex items-center gap-2">
            <AlertCircle size={16} />
            Información de Debug
          </h3>
          <div className="text-sm text-yellow-700 space-y-1">
            <p>• Proyectos cargados: {proyectos.length}</p>
            <p>• Materiales cargados: {repMateriales?.length || 0} 
              {errorMateriales && ` - ERROR: ${JSON.stringify(errorMateriales)}`}
            </p>
            <p>• Clientes cargados: {repClientes?.length || 0} 
              {errorClientes && ` - ERROR: ${JSON.stringify(errorClientes)}`}
            </p>
            <p>• Avances cargados: {avances.length}</p>
            <p>• Etapas cargadas: {etapas.length}</p>
          </div>
        </div>

        {/* FILTROS PARA AVANCES */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Filtros para Avances de Proyectos</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Los filtros permanecen igual */}
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
                disabled={!selectedProjectId || loadingEtapas}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="">Seleccionar etapa</option>
                {loadingEtapas && <option>Cargando...</option>}
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
                Usa el botón de descarga arriba para exportar.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleReportes;