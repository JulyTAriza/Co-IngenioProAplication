"use client";

import React, { useMemo, useState } from "react";
import Header from "@/app/(components)/Header";
import {
  useGetProyectosQuery,
  useGetReporteEtapasQuery,
  useGetReporteAvancesQuery,
  useGetReporteMaterialesQuery,
  useGetReporteMaterialesPorEtapaQuery,
  useGetReportePersonalProyectoQuery,
  useGetReporteEstadosPersonalQuery,
  useGetReporteClientesQuery,
  ReporteAvanceEtapa,
  ReporteEtapaProyecto,
} from "@/state/api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ReportesAvances: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [selectedEtapaId, setSelectedEtapaId] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tipoReporteExtra, setTipoReporteExtra] = useState<string>("");

  // --- QUERIES PRINCIPALES ---
  const { data: proyectos = [], isLoading: loadingProyectos } = useGetProyectosQuery({});
  
  const { 
    data: etapas = [], 
    isLoading: loadingEtapas 
  } = useGetReporteEtapasQuery(
    Number(selectedProjectId), 
    { skip: !selectedProjectId }
  );
  
  const { 
    data: avances = [], 
    isLoading: loadingAvances 
  } = useGetReporteAvancesQuery(
    Number(selectedEtapaId), 
    { skip: !selectedEtapaId }
  );

  // --- QUERIES PARA REPORTES EXTRA ---
  const { 
    data: repMateriales,
    isLoading: loadingMateriales,
    isError: errorMateriales 
  } = useGetReporteMaterialesQuery(
    Number(selectedProjectId),
    { 
      skip: tipoReporteExtra !== "materiales" || !selectedProjectId 
    }
  );

  const { 
    data: repMaterialesEtapa,
    isLoading: loadingMaterialesEtapa,
    isError: errorMaterialesEtapa 
  } = useGetReporteMaterialesPorEtapaQuery(
    Number(selectedEtapaId),
    { 
      skip: tipoReporteExtra !== "materialesEtapa" || !selectedEtapaId 
    }
  );

  const { 
    data: repPersonalProyecto,
    isLoading: loadingPersonalProyecto,
    isError: errorPersonalProyecto 
  } = useGetReportePersonalProyectoQuery(
    Number(selectedProjectId),
    { 
      skip: tipoReporteExtra !== "personalProyecto" || !selectedProjectId 
    }
  );

  const { 
    data: repEstadosPersonal,
    isLoading: loadingEstadosPersonal,
    isError: errorEstadosPersonal 
  } = useGetReporteEstadosPersonalQuery(undefined, {
    skip: tipoReporteExtra !== "estadosPersonal"
  });

  const { 
    data: repClientes,
    isLoading: loadingClientes,
    isError: errorClientes 
  } = useGetReporteClientesQuery(undefined, {
    skip: tipoReporteExtra !== "clientes"
  });

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

  const getProjectId = (p: any) => p?.id_proyecto ?? p?.id ?? null;
  const getProjectName = (p: any) => p?.nombre ?? String(getProjectId(p));
  const getEtapaId = (e: any) => e?.id_etapa ?? e?.id ?? null;
  const getEtapaName = (e: any) => e?.nombre_etapa ?? e?.nombre ?? String(getEtapaId(e));

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

  // --- DESCARGA AVANCES ---
  const handleDownloadExcelAvances = () => {
    if (filteredAvances.length === 0) {
      alert("No hay datos de avances para descargar.");
      return;
    }

    const rows = filteredAvances.map((a) => ({
      Fecha: formatToISODate(a.fecha),
      Descripción: a.descripcion ?? "",
      Porcentaje: a.porcentaje_avance ?? "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Avances");
    XLSX.writeFile(wb, `reporte_avances_${selectedEtapaId || "all"}.xlsx`);
  };

  const handleDownloadPDFAvances = () => {
    if (filteredAvances.length === 0) {
      alert("No hay datos de avances para descargar.");
      return;
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    
    // Título
    doc.setFontSize(16);
    doc.text("Reporte de Avances", 40, 30);
    
    autoTable(doc, {
      head: [["Fecha", "Descripción", "Porcentaje (%)"]],
      body: filteredAvances.map((a) => [
        formatToISODate(a.fecha),
        a.descripcion ?? "—",
        a.porcentaje_avance != null ? String(a.porcentaje_avance) : "—",
      ]),
      startY: 50,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [30, 64, 175] },
    });
    
    doc.save(`reporte_avances_${selectedEtapaId || "all"}.pdf`);
  };

  // --- OBTENER DATOS DEL REPORTE EXTRA ---
  const getCurrentReportData = () => {
    switch (tipoReporteExtra) {
      case "materiales":
        return {
          data: repMateriales,
          loading: loadingMateriales,
          error: errorMateriales,
          requiresProject: true,
        };
      case "materialesEtapa":
        return {
          data: repMaterialesEtapa,
          loading: loadingMaterialesEtapa,
          error: errorMaterialesEtapa,
          requiresProject: false,
          requiresEtapa: true,
        };
      case "personalProyecto":
        return {
          data: repPersonalProyecto,
          loading: loadingPersonalProyecto,
          error: errorPersonalProyecto,
          requiresProject: true,
        };
      case "estadosPersonal":
        return {
          data: repEstadosPersonal,
          loading: loadingEstadosPersonal,
          error: errorEstadosPersonal,
        };
      case "clientes":
        return {
          data: repClientes,
          loading: loadingClientes,
          error: errorClientes,
        };
      default:
        return null;
    }
  };

  // --- DESCARGA OTROS REPORTES ---
  const handleDownloadReporteExtra = () => {
    const reportInfo = getCurrentReportData();
    
    if (!reportInfo) {
      alert("Selecciona un tipo de reporte.");
      return;
    }

    if (reportInfo.loading) {
      alert("Cargando datos, espera un momento...");
      return;
    }

    if (reportInfo.error) {
      alert("Error al cargar los datos del reporte.");
      return;
    }

    // Validaciones específicas
    if (reportInfo.requiresProject && !selectedProjectId) {
      alert("Selecciona un proyecto primero.");
      return;
    }

    if (reportInfo.requiresEtapa && !selectedEtapaId) {
      alert("Selecciona una etapa primero.");
      return;
    }

    const { data } = reportInfo;

    if (!data || (Array.isArray(data) && data.length === 0)) {
      alert("No hay datos disponibles para este reporte.");
      return;
    }

    // Convertir datos a array si es necesario
    const rows = Array.isArray(data) ? data : [data];

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tipoReporteExtra || "reporte");
    XLSX.writeFile(wb, `reporte_${tipoReporteExtra || "extra"}.xlsx`);
  };

  // --- RENDER DEL BOTÓN DE DESCARGA ---
  const renderDownloadButton = () => {
    const reportInfo = getCurrentReportData();
    
    if (!tipoReporteExtra) {
      return (
        <button disabled className="bg-gray-400 text-white px-4 py-2 rounded-md">
          Selecciona un reporte
        </button>
      );
    }

    if (reportInfo?.loading) {
      return (
        <button disabled className="bg-blue-400 text-white px-4 py-2 rounded-md">
          Cargando...
        </button>
      );
    }

    const isDisabled = 
      (reportInfo?.requiresProject && !selectedProjectId) ||
      (reportInfo?.requiresEtapa && !selectedEtapaId) ||
      reportInfo?.error;

    return (
      <button
        onClick={handleDownloadReporteExtra}
        disabled={isDisabled}
        className={`px-4 py-2 rounded-md text-white ${
          isDisabled 
            ? "bg-gray-400 cursor-not-allowed" 
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        Descargar Excel
      </button>
    );
  };

  return (
    <div className="p-4">
      <div className="mb-5">
        <Header name="Reportes — Avances y Otros" />
        <p className="text-sm text-gray-500">
          Consulta avances por etapa o descarga otros reportes generales.
        </p>
      </div>

      {/* FILTROS AVANCES */}
      <div className="bg-white shadow rounded-lg p-6 mb-6 grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium">Proyecto</label>
          <select
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value === "" ? "" : Number(e.target.value));
              setSelectedEtapaId("");
            }}
            className="mt-1 block w-full border-gray-300 rounded-md p-2"
          >
            <option value="">— Seleccione proyecto —</option>
            {proyectos.map((p: any) => (
              <option key={getProjectId(p)} value={getProjectId(p)}>
                {getProjectName(p)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Etapa</label>
          <select
            value={selectedEtapaId}
            onChange={(e) => setSelectedEtapaId(e.target.value === "" ? "" : Number(e.target.value))}
            disabled={!selectedProjectId || loadingEtapas}
            className="mt-1 block w-full border-gray-300 rounded-md p-2 disabled:bg-gray-100"
          >
            <option value="">— Seleccione etapa —</option>
            {etapas.map((et: ReporteEtapaProyecto) => (
              <option key={getEtapaId(et)} value={getEtapaId(et)}>
                {getEtapaName(et)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Desde</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            className="mt-1 block w-full border-gray-300 rounded-md p-2" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Hasta</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            className="mt-1 block w-full border-gray-300 rounded-md p-2" 
          />
        </div>

        <div className="md:col-span-2 flex gap-2 justify-end">
          <button 
            onClick={handleDownloadPDFAvances} 
            disabled={filteredAvances.length === 0}
            className="bg-red-600 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700"
          >
            PDF Avances
          </button>
          <button 
            onClick={handleDownloadExcelAvances} 
            disabled={filteredAvances.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700"
          >
            Excel Avances
          </button>
        </div>
      </div>

      {/* OTROS REPORTES */}
      <div className="bg-white shadow rounded-lg p-6 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="md:col-span-3">
          <label className="block text-sm font-medium">Otros reportes</label>
          <select
            value={tipoReporteExtra}
            onChange={(e) => setTipoReporteExtra(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md p-2"
          >
            <option value="">— Seleccione —</option>
            <option value="materiales">Materiales por Proyecto</option>
            <option value="materialesEtapa">Materiales por Etapa</option>
            <option value="personalProyecto">Personal por Proyecto</option>
            <option value="estadosPersonal">Estados de Personal</option>
            <option value="clientes">Clientes</option>
          </select>
          
          {/* Ayuda contextual */}
          {tipoReporteExtra === "materiales" && (
            <p className="text-xs text-blue-600 mt-1">Requiere seleccionar un proyecto</p>
          )}
          {tipoReporteExtra === "materialesEtapa" && (
            <p className="text-xs text-blue-600 mt-1">Requiere seleccionar proyecto y etapa</p>
          )}
          {tipoReporteExtra === "personalProyecto" && (
            <p className="text-xs text-blue-600 mt-1">Requiere seleccionar un proyecto</p>
          )}
        </div>
        
        <div className="flex justify-end">
          {renderDownloadButton()}
        </div>
      </div>

      {/* TABLA AVANCES */}
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <div className="p-4 border-b">
          <h3 className="font-medium">Avances de Etapa</h3>
          {loadingAvances && <p className="text-sm text-blue-600">Cargando avances...</p>}
        </div>
        
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Descripción</th>
              <th className="px-4 py-3 text-left">Porcentaje (%)</th>
            </tr>
          </thead>
          <tbody>
            {filteredAvances.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center p-8 text-gray-500">
                  {!selectedEtapaId 
                    ? "Selecciona un proyecto y una etapa para ver los avances"
                    : loadingAvances 
                    ? "Cargando avances..."
                    : "No hay avances registrados para esta etapa"
                  }
                </td>
              </tr>
            ) : (
              filteredAvances.map((a, i) => (
                <tr key={a.id_avance ?? i} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{formatToISODate(a.fecha) || "—"}</td>
                  <td className="px-4 py-3">{a.descripcion ?? "—"}</td>
                  <td className="px-4 py-3">
                    {a.porcentaje_avance != null ? `${a.porcentaje_avance}%` : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportesAvances;
