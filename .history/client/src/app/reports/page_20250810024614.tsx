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

  // --- QUERIES ---
  const { data: proyectos = [] } = useGetProyectosQuery({});
  const { data: etapas = [] } = useGetReporteEtapasQuery(
    selectedProjectId ? Number(selectedProjectId) : skipToken
  );
  const { data: avances = [] } = useGetReporteAvancesQuery(
    selectedEtapaId ? Number(selectedEtapaId) : skipToken
  );

  // ---------- CORRECCIÓN: otros reportes usando skipToken y params reales ----------
  // repMateriales: ejecuta sólo si eliges "materiales" y hay proyecto seleccionado
  const { data: repMateriales } = useGetReporteMaterialesQuery(
    (
      tipoReporteExtra === "materiales" && selectedProjectId
        ? Number(selectedProjectId)
        : skipToken
    ) as any
  );

  // repMaterialesEtapa: ejecuta sólo si eliges "materialesEtapa" y hay etapa seleccionada
  const { data: repMaterialesEtapa } = useGetReporteMaterialesPorEtapaQuery(
    (
      tipoReporteExtra === "materialesEtapa" && selectedEtapaId
        ? Number(selectedEtapaId)
        : skipToken
    ) as any
  );

  // repPersonalProyecto: ejecuta sólo si eliges "personalProyecto" y hay proyecto seleccionado
  const { data: repPersonalProyecto } = useGetReportePersonalProyectoQuery(
    (
      tipoReporteExtra === "personalProyecto" && selectedProjectId
        ? Number(selectedProjectId)
        : skipToken
    ) as any
  );

  // repEstadosPersonal: reporte global de estados de personal (sin id) — se ejecuta sólo si lo seleccionas
  const { data: repEstadosPersonal } = useGetReporteEstadosPersonalQuery(
    (tipoReporteExtra === "estadosPersonal" ? (undefined as any) : skipToken) as any
  );

  // repClientes: reporte global de clientes (sin id) — se ejecuta sólo si lo seleccionas
  const { data: repClientes } = useGetReporteClientesQuery(
    (tipoReporteExtra === "clientes" ? (undefined as any) : skipToken) as any
  );

  // --- FORMATEO ---
  const formatToISODate = (value?: string | null) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toISOString().split("T")[0];
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

  // --- DESCARGA AVANCES ---
  const handleDownloadExcelAvances = () => {
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
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    autoTable(doc, {
      head: [["Fecha", "Descripción", "Porcentaje (%)"]],
      body: filteredAvances.map((a) => [
        formatToISODate(a.fecha),
        a.descripcion ?? "—",
        a.porcentaje_avance != null ? String(a.porcentaje_avance) : "—",
      ]),
      startY: 40,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [30, 64, 175] },
    });
    doc.save(`reporte_avances_${selectedEtapaId || "all"}.pdf`);
  };

  // --- DESCARGA OTROS REPORTES ---
  const handleDownloadReporteExtra = () => {
    let data: any[] | undefined;

    switch (tipoReporteExtra) {
      case "materiales":
        data = repMateriales;
        break;
      case "materialesEtapa":
        data = repMaterialesEtapa;
        break;
      case "personalProyecto":
        data = repPersonalProyecto;
        break;
      case "estadosPersonal":
        data = repEstadosPersonal;
        break;
      case "clientes":
        data = repClientes;
        break;
      default:
        data = undefined;
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      alert("No hay datos para este reporte.");
      return;
    }

    // Si la API devuelve un objeto en vez de array, intenta convertirlo en array de objetos:
    const rows = Array.isArray(data) ? data : [data];

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tipoReporteExtra || "reporte");
    XLSX.writeFile(wb, `reporte_${tipoReporteExtra || "extra"}.xlsx`);
  };

  // helpers IDs y nombres
  const getProjectId = (p: any) => p?.id_proyecto ?? p?.id ?? null;
  const getProjectName = (p: any) => p?.nombre ?? String(getProjectId(p));
  const getEtapaId = (e: any) => e?.id_etapa ?? e?.id ?? null;
  const getEtapaName = (e: any) => e?.nombre_etapa ?? String(getEtapaId(e));

  return (
    <div className="p-4">
      <div className="mb-5">
        <Header name="Reportes — Avances y Otros" />
        <p className="text-sm text-gray-500">
          Consulta avances por etapa o descarga otros reportes generales.
        </p>
      </div>

      {/* filtros avances */}
      <div className="bg-white shadow rounded-lg p-6 mb-6 grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium">Proyecto</label>
          <select
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value === "" ? "" : Number(e.target.value));
              setSelectedEtapaId("");
            }}
            className="mt-1 block w-full border-gray-300 rounded-md"
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
            disabled={!selectedProjectId}
            className="mt-1 block w-full border-gray-300 rounded-md"
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
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium">Hasta</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md" />
        </div>

        <div className="md:col-span-2 flex gap-2 justify-end">
          <button onClick={handleDownloadPDFAvances} disabled={filteredAvances.length === 0} className="bg-red-600 text-white px-4 py-2 rounded-md disabled:opacity-50">PDF Avances</button>
          <button onClick={handleDownloadExcelAvances} disabled={filteredAvances.length === 0} className="bg-green-600 text-white px-4 py-2 rounded-md disabled:opacity-50">Excel Avances</button>
        </div>
      </div>

      {/* otros reportes */}
      <div className="bg-white shadow rounded-lg p-6 mb-6 flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium">Otros reportes</label>
          <select
            value={tipoReporteExtra}
            onChange={(e) => setTipoReporteExtra(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md"
          >
            <option value="">— Seleccione —</option>
            <option value="materiales">Materiales</option>
            <option value="materialesEtapa">Materiales por Etapa</option>
            <option value="personalProyecto">Personal por Proyecto</option>
            <option value="estadosPersonal">Estados de Personal</option>
            <option value="clientes">Clientes</option>
          </select>
        </div>
        <button
          onClick={handleDownloadReporteExtra}
          disabled={!tipoReporteExtra}
          className="bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
        >
          Descargar Excel
        </button>
      </div>

      {/* tabla avances */}
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Descripción</th>
              <th className="px-4 py-2">Porcentaje (%)</th>
            </tr>
          </thead>
          <tbody>
            {filteredAvances.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center p-4">No hay avances</td>
              </tr>
            ) : (
              filteredAvances.map((a, i) => (
                <tr key={a.id_avance ?? i} className="border-t">
                  <td className="px-4 py-2">{formatToISODate(a.fecha) || "—"}</td>
                  <td className="px-4 py-2">{a.descripcion ?? "—"}</td>
                  <td className="px-4 py-2">{a.porcentaje_avance ?? "—"}</td>
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
