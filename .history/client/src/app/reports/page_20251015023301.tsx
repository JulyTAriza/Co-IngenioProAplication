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
import { Download, BarChart3, Users, Package } from "lucide-react";

// Componente simple para evitar el error del store
const SimpleReportes = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [selectedEtapaId, setSelectedEtapaId] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isClient, setIsClient] = useState(false);

  // Solo ejecutar en el cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  // --- QUERIES PRINCIPALES ---
  const { data: proyectos = [] } = useGetProyectosQuery({});
  const { data: etapas = [] } = useGetReporteEtapasQuery(
    selectedProjectId !== "" ? Number(selectedProjectId) : skipToken
  );
  const { data: avances = [] } = useGetReporteAvancesQuery(
    selectedEtapaId !== "" ? Number(selectedEtapaId) : skipToken
  );

  // --- QUERIES PARA REPORTES EXTRA ---
  const { data: repMateriales, isLoading: loadingMateriales } = useGetReporteMaterialesQuery();
  const { data: repClientes, isLoading: loadingClientes } = useGetReporteClientesQuery();

  // --- HELPERS ---
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
      const fecha = a.fecha ? new Date(a.fecha).toISOString().split('T')[0] : '';
      const afterStart = !startDate || fecha >= startDate;
      const beforeEnd = !endDate || fecha <= endDate;
      return afterStart && beforeEnd;
    });
  }, [avances, startDate, endDate]);

  // --- FUNCIÓN SIMPLIFICADA PARA DESCARGAR EXCEL ---
  const downloadExcel = (data: any[], fileName: string) => {
    try {
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
      Fecha: formatDisplayDate(a.fecha),
      Descripción: a.descripcion || "Sin descripción",
      'Porcentaje Avance': a.porcentaje_avance || 0,
    }));
    
    downloadExcel(rows, "reporte_avances");
  };

  const handleDownloadMateriales = () => {
    if (!repMateriales || repMateriales.length === 0) {
      alert("No hay datos de materiales para descargar.");
      return;
    }

    downloadExcel(repMateriales, "reporte_materiales");
  };

  const handleDownloadClientes = () => {
    if (!repClientes || repClientes.length === 0) {
      alert("No hay datos de clientes para descargar.");
      return;
    }

    downloadExcel(repClientes, "reporte_clientes");
  };

  // --- ESTADÍSTICAS RÁPIDAS ---
  const stats = [
    {
      title: "Avances",
      value: filteredAvances.length,
      icon: BarChart3,
      color: "bg-blue-500",
      onClick: handleDownloadAvances,
      disabled: filteredAvances.length === 0
    },
    {
      title: "Materiales",
      value: repMateriales?.length || 0,
      icon: Package,
      color: "bg-purple-500",
      onClick: handleDownloadMateriales,
      disabled: !repMateriales || repMateriales.length === 0
    },
    {
      title: "Clientes",
      value: repClientes?.length || 0,
      icon: Users,
      color: "bg-orange-500",
      onClick: handleDownloadClientes,
      disabled: !repClientes || repClientes.length === 0
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

        {/* ESTADÍSTICAS RÁPIDAS CON BOTONES DE DESCARGA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
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
                <Download size={16} />
                Descargar Excel
              </button>
            </div>
          ))}
        </div>

        {/* FILTROS PARA AVANCES */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
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

          {/* INFO DE AVANCES */}
          {filteredAvances.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>{filteredAvances.length}</strong> registros de avance encontrados. 
                Usa el botón de descarga arriba para exportar.
              </p>
            </div>
          )}
        </div>

        {/* DESCRIPCIÓN DE REPORTES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h4 className="font-semibold text-gray-800 mb-3">📦 Reporte de Materiales</h4>
            <p className="text-sm text-gray-600 mb-3">
              Incluye todos los materiales del sistema con información de stock, categorías y proveedores.
            </p>
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Nombre y descripción del material</p>
              <p>• Categoría y tipo</p>
              <p>• Cantidad en stock</p>
              <p>• Proveedor y costo</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h4 className="font-semibold text-gray-800 mb-3">👥 Reporte de Clientes</h4>
            <p className="text-sm text-gray-600 mb-3">
              Listado completo de clientes registrados con información de contacto y proyectos asociados.
            </p>
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Nombre y información de contacto</p>
              <p>• Proyectos asignados</p>
              <p>• Estado del cliente</p>
              <p>• Fechas de registro</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente principal que envuelve el componente simple
const ReportesAvances: React.FC = () => {
  return <SimpleReportes />;
};

export default ReportesAvances;