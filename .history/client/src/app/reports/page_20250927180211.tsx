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
} from "@/state/api";
import { skipToken } from "@reduxjs/toolkit/query";
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
  const { data: proyectos = [] } = useGetProyectosQuery({});
  const { data: etapas = [] } = useGetReporteEtapasQuery(
    selectedProjectId !== "" ? Number(selectedProjectId) : skipToken
  );
  const { data: avances = [] } = useGetReporteAvancesQuery(
    selectedEtapaId !== "" ? Number(selectedEtapaId) : skipToken
  );

  // --- QUERIES PARA REPORTES EXTRA ---
  const { data: repMaterialesAll, isLoading: loadingMaterialesAll, isError: errorMaterialesAll } =
    useGetReporteMaterialesQuery(tipoReporteExtra === "materialesAll" ? undefined : skipToken);

  const { data: repMateriales, isLoading: loadingMateriales, isError: errorMateriales } =
    useGetReporteMaterialesQuery(
      tipoReporteExtra === "materiales" && selectedProjectId !== "" ? undefined : skipToken
    );

  const { data: repMaterialesEtapa, isLoading: loadingMaterialesEtapa, isError: errorMaterialesEtapa } =
    useGetReporteMaterialesPorEtapaQuery(
      tipoReporteExtra === "materialesEtapa" && selectedEtapaId !== ""
        ? Number(selectedEtapaId)
        : skipToken
    );

  const { data: repPersonalProyecto, isLoading: loadingPersonalProyecto, isError: errorPersonalProyecto } =
    useGetReportePersonalProyectoQuery(
      tipoReporteExtra === "personalProyecto" && selectedProjectId !== ""
        ? Number(selectedProjectId)
        : skipToken
    );

  const { data: repEstadosPersonal, isLoading: loadingEstadosPersonal, isError: errorEstadosPersonal } =
    useGetReporteEstadosPersonalQuery(tipoReporteExtra === "estadosPersonal" ? undefined : skipToken);

  const { data: repClientes, isLoading: loadingClientes, isError: errorClientes } =
    useGetReporteClientesQuery(tipoReporteExtra === "clientes" ? undefined : skipToken);

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

  // --- DESCARGAS ---
  const downloadExcel = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
    downloadExcel(rows, `reporte_avances_${selectedEtapaId || "all"}.xlsx`);
  };

  const handleDownloadPDFAvances = () => {
    if (filteredAvances.length === 0) {
      alert("No hay datos de avances para descargar.");
      return;
    }
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
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
      case "materialesAll":
        return { data: repMaterialesAll, loading: loadingMaterialesAll, error: errorMaterialesAll };
      case "materiales":
        return { data: repMateriales, loading: loadingMateriales, error: errorMateriales, requiresProject: true };
      case "materialesEtapa":
        return { data: repMaterialesEtapa, loading: loadingMaterialesEtapa, error: errorMaterialesEtapa, requiresEtapa: true };
      case "personalProyecto":
        return { data: repPersonalProyecto, loading: loadingPersonalProyecto, error: errorPersonalProyecto, requiresProject: true };
      case "estadosPersonal":
        return { data: repEstadosPersonal, loading: loadingEstadosPersonal, error: errorEstadosPersonal };
      case "clientes":
        return { data: repClientes, loading: loadingClientes, error: errorClientes };
      default:
        return null;
    }
  };

  // --- DESCARGA OTROS REPORTES ---
  const handleDownloadReporteExtra = () => {
    const reportInfo = getCurrentReportData();
    if (!reportInfo) return alert("Selecciona un tipo de reporte.");
    if (reportInfo.loading) return alert("Cargando datos, espera un momento...");
    if (reportInfo.error) return alert("Error al cargar los datos del reporte.");
    if (reportInfo.requiresProject && !selectedProjectId) return alert("Selecciona un proyecto primero.");
    if (reportInfo.requiresEtapa && !selectedEtapaId) return alert("Selecciona una etapa primero.");

    const { data } = reportInfo;
    if (!data || (Array.isArray(data) && data.length === 0)) return alert("No hay datos disponibles para este reporte.");

    const rows = Array.isArray(data) ? data : typeof data === "object" ? [data] : [];
    if (rows.length === 0) return alert("No hay datos válidos en este reporte.");

    downloadExcel(rows, `reporte_${tipoReporteExtra || "extra"}.xlsx`);
  };

  // --- RENDER BOTÓN DESCARGA ---
  const renderDownloadButton = () => {
    const reportInfo = getCurrentReportData();
    if (!tipoReporteExtra) {
      return <button disabled className="bg-gray-400 text-white px-4 py-2 rounded-md">Selecciona un reporte</button>;
    }
    if (reportInfo?.loading) {
      return <button disabled className="bg-blue-400 text-white px-4 py-2 rounded-md">Cargando...</button>;
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
          isDisabled ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        Descargar Excel
      </button>
    );
  };

  return (
    <div className="p-4 space-y-6">
      <Header name="Reportes — Avances y Otros" />

      {/* FILTROS AVANCES */}
      <div className="bg-white shadow rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium">Proyecto</label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : "")}
            className="mt-1 block w-full border rounded p-2"
          >
            <option value="">— Seleccione —</option>
            {proyectos.map((p: any) => (
              <option key={p.id_proyecto} value={p.id_proyecto}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Etapa</label>
          <select
            value={selectedEtapaId}
            onChange={(e) => setSelectedEtapaId(e.target.value ? Number(e.target.value) : "")}
            className="mt-1 block w-full border rounded p-2"
          >
            <option value="">— Seleccione —</option>
            {etapas.map((et: any) => (
              <option key={et.id_etapa} value={et.id_etapa}>
                {et.nombre_etapa}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Fecha inicio</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Fecha fin</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 block w-full border rounded p-2"
          />
        </div>
      </div>

      {/* BOTONES AVANCES */}
      <div className="flex gap-4">
        <button onClick={handleDownloadExcelAvances} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
          Descargar Excel Avances
        </button>
        <button onClick={handleDownloadPDFAvances} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
          Descargar PDF Avances
        </button>
      </div>

      {/* TABLA AVANCES */}
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="font-semibold mb-3">Avances</h2>
        <table className="min-w-full border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-3 py-2 border">Fecha</th>
              <th className="px-3 py-2 border">Descripción</th>
              <th className="px-3 py-2 border">% Avance</th>
            </tr>
          </thead>
          <tbody>
            {filteredAvances.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-3">
                  No hay avances
                </td>
              </tr>
            ) : (
              filteredAvances.map((a, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border">{formatToISODate(a.fecha)}</td>
                  <td className="px-3 py-2 border">{a.descripcion ?? "—"}</td>
                  <td className="px-3 py-2 border text-center">{a.porcentaje_avance ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* OTROS REPORTES */}
      <div className="bg-white shadow rounded-lg p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="md:col-span-3">
          <label className="block text-sm font-medium">Otros reportes</label>
          <select
            value={tipoReporteExtra}
            onChange={(e) => setTipoReporteExtra(e.target.value)}
            className="mt-1 block w-full border rounded p-2"
          >
            <option value="">— Seleccione —</option>
            <option value="materialesAll">Materiales (Todos)</option>
            <option value="materiales">Materiales por Proyecto</option>
            <option value="materialesEtapa">Materiales por Etapa</option>
            <option value="personalProyecto">Personal por Proyecto</option>
            <option value="estadosPersonal">Estados de Personal</option>
            <option value="clientes">Clientes</option>
          </select>
        </div>
        <div className="flex justify-end">{renderDownloadButton()}</div>
      </div>
    </div>
  );
};

export default ReportesAvances;



