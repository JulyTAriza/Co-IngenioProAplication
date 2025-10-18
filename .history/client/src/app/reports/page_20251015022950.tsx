"use client";

import React, { useMemo, useState } from "react";
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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, FileText, BarChart3, Users, Package, Calendar, Filter, Building, Truck } from "lucide-react";

const ReportesAvances: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [selectedEtapaId, setSelectedEtapaId] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // --- QUERIES PRINCIPALES ---
  const { data: proyectos = [] } = useGetProyectosQuery({});
  const { data: etapas = [] } = useGetReporteEtapasQuery(
    selectedProjectId !== "" ? Number(selectedProjectId) : skipToken
  );
  const { data: avances = [] } = useGetReporteAvancesQuery(
    selectedEtapaId !== "" ? Number(selectedEtapaId) : skipToken
  );

  // --- QUERIES PARA REPORTES EXTRA ---
  const { data: repMateriales, isLoading: loadingMateriales, isError: errorMateriales } =
    useGetReporteMaterialesQuery();

  const { data: repClientes, isLoading: loadingClientes, isError: errorClientes } =
    useGetReporteClientesQuery();

  // --- HELPERS ---
  const formatToISODate = (value?: string | null) => {
    if (!value) return "";
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      return d.toISOString().split("T")[0];
    } catch {
      return value || "";
    }
  };

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

  // --- FILTRO AVANCES ---
  const filteredAvances = useMemo(() => {
    const list = (avances ?? []) as ReporteAvanceEtapa[];
    if (!startDate && !endDate) return list;
    return list.filter((a) => {
      const fecha = formatToISODate(a.fecha);
      const afterStart = !startDate || fecha >= startDate;
      const beforeEnd = !endDate || fecha <= endDate;
      return afterStart && beforeEnd;
    });
  }, [avances, startDate, endDate]);

  // --- FUNCIÓN SIMPLIFICADA PARA DESCARGAR EXCEL ---
  const downloadExcel = (data: any[], fileName: string) => {
    try {
      console.log("Datos a descargar:", data);
      
      if (!data || data.length === 0) {
        alert("No hay datos para descargar.");
        return;
      }

      // Crear workbook y worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Agregar worksheet al workbook
      XLSX.utils.book_append_sheet(wb, ws, "Reporte");
      
      // Generar el archivo y descargar
      XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
      
    } catch (error) {
      console.error("Error al descargar Excel:", error);
      alert("Error al generar el archivo Excel. Por favor, intenta nuevamente.");
    }
  };

  // --- MANEJADORES DE DESCARGA ---
  const handleDownloadExcelAvances = () => {
    if (filteredAvances.length === 0) {
      alert("No hay datos de avances para descargar.");
      return;
    }
    
    const rows = filteredAvances.map((a) => ({
      Fecha: formatDisplayDate(a.fecha),
      Descripción: a.descripcion || "Sin descripción",
      'Porcentaje Avance': a.porcentaje_avance || 0,
    }));
    
    downloadExcel(rows, "reporte_avances");
  };

  const handleDownloadMateriales = () => {
    if (loadingMateriales) {
      alert("Los datos aún se están cargando...");
      return;
    }

    if (errorMateriales) {
      alert("Error al cargar los datos de materiales.");
      return;
    }

    if (!repMateriales || repMateriales.length === 0) {
      alert("No hay datos de materiales para descargar.");
      return;
    }

    console.log("Descargando materiales:", repMateriales);
    downloadExcel(repMateriales, "reporte_materiales");
  };

  const handleDownloadClientes = () => {
    if (loadingClientes) {
      alert("Los datos aún se están cargando...");
      return;
    }

    if (errorClientes) {
      alert("Error al cargar los datos de clientes.");
      return;
    }

    if (!repClientes || repClientes.length === 0) {
      alert("No hay datos de clientes para descargar.");
      return;
    }

    console.log("Descargando clientes:", repClientes);
    downloadExcel(repClientes, "reporte_clientes");
  };

  // --- ESTADÍSTICAS RÁPIDAS ---
  const stats = [
    {
      title: "Total Avances",
      value: filteredAvances.length,
      icon: BarChart3,
      color: "bg-blue-500",
      description: "Registros de avance"
    },
    {
      title: "Proyectos Activos",
      value: proyectos.length,
      icon: FileText,
      color: "bg-green-500",
      description: "Proyectos en sistema"
    },
    {
      title: "Materiales",
      value: repMateriales?.length || 0,
      icon: Package,
      color: "bg-purple-500",
      description: "Items en inventario"
    },
    {
      title: "Clientes",
      value: repClientes?.length || 0,
      icon: Users,
      color: "bg-orange-500",
      description: "Clientes registrados"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Header name="Reportes del Sistema" />

        {/* ESTADÍSTICAS RÁPIDAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="text-white" size={24} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* SECCIÓN DE REPORTES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* REPORTE DE AVANCES */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="text-blue-600" size={24} />
              <h3 className="text-lg font-semibold text-gray-800">Avances de Proyectos</h3>
            </div>
            
            <div className="space-y-4 mb-4">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Desde</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hasta</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={handleDownloadExcelAvances}
                disabled={filteredAvances.length === 0}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                  filteredAvances.length === 0
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl"
                }`}
              >
                <Download size={18} />
                Descargar Excel
              </button>
            </div>

            <div className="mt-3 text-sm text-gray-600">
              <p>{filteredAvances.length} registros encontrados</p>
            </div>
          </div>

          {/* REPORTE DE MATERIALES */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Package className="text-purple-600" size={24} />
              <h3 className="text-lg font-semibold text-gray-800">Inventario de Materiales</h3>
            </div>
            
            <p className="text-gray-600 mb-4 text-sm">
              Reporte completo de todos los materiales en el sistema, incluyendo stock, categorías y proveedores.
            </p>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Total materiales: {repMateriales?.length || 0}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Columnas: Nombre, Categoría, Stock, Proveedor</span>
              </div>
            </div>

            <button 
              onClick={handleDownloadMateriales}
              disabled={loadingMateriales || !repMateriales || repMateriales.length === 0}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                loadingMateriales || !repMateriales || repMateriales.length === 0
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl"
              }`}
            >
              {loadingMateriales ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Cargando...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Descargar Reporte
                </>
              )}
            </button>

            {errorMateriales && (
              <p className="mt-2 text-sm text-red-600">Error al cargar materiales</p>
            )}
          </div>

          {/* REPORTE DE CLIENTES */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="text-orange-600" size={24} />
              <h3 className="text-lg font-semibold text-gray-800">Base de Clientes</h3>
            </div>
            
            <p className="text-gray-600 mb-4 text-sm">
              Listado completo de todos los clientes registrados en el sistema con información de contacto y proyectos.
            </p>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>Total clientes: {repClientes?.length || 0}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>Columnas: Nombre, Contacto, Proyectos, Estado</span>
              </div>
            </div>

            <button 
              onClick={handleDownloadClientes}
              disabled={loadingClientes || !repClientes || repClientes.length === 0}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                loadingClientes || !repClientes || repClientes.length === 0
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl"
              }`}
            >
              {loadingClientes ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Cargando...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Descargar Reporte
                </>
              )}
            </button>

            {errorClientes && (
              <p className="mt-2 text-sm text-red-600">Error al cargar clientes</p>
            )}
          </div>
        </div>

        {/* TABLA DE AVANCES (solo si hay datos) */}
        {filteredAvances.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">Vista Previa - Avances</h3>
              <p className="text-sm text-gray-600 mt-1">
                Mostrando {filteredAvances.length} de {avances.length} registros
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % Avance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAvances.map((a, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatDisplayDate(a.fecha)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {a.descripcion ?? "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {a.porcentaje_avance ?? "—"}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportesAvances;