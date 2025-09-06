"use client";

import React, { useMemo, useState } from "react";
import Header from "@/app/(components)/Header";
import {
  useGetProyectosQuery,
  useGetReporteEtapasQuery,
  useGetReporteAvancesQuery,
  ReporteAvanceEtapa,
  ReporteEtapaProyecto,
} from "@/state/api";
import { skipToken } from "@reduxjs/toolkit/query/react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ReportesAvances: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [selectedEtapaId, setSelectedEtapaId] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // proyectos (llama sin filtros -> pasar {} como param según tu api)
  const { data: proyectos = [], isLoading: loadingProyectos } = useGetProyectosQuery({});

  // etapas: sólo si hay proyecto seleccionado
  const {
    data: etapas = [],
    isLoading: loadingEtapas,
  } = useGetReporteEtapasQuery(selectedProjectId ? Number(selectedProjectId) : skipToken);

  // avances: sólo si hay etapa seleccionada
  const {
    data: avances = [],
    isLoading: loadingAvances,
    isError: errorAvances,
  } = useGetReporteAvancesQuery(selectedEtapaId ? Number(selectedEtapaId) : skipToken);

  // formatea fecha a YYYY-MM-DD si es posible
  const formatToISODate = (value?: string | null) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value; // fallback: devuelve lo que venga
    return d.toISOString().split("T")[0];
  };

  // Filtrado por fechas (usa campo 'fecha' del SP sp_reporte_avances_por_etapa)
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

  // Descarga Excel
  const handleDownloadExcel = () => {
    const rows = filteredAvances.map((a) => ({
      Fecha: formatToISODate(a.fecha),
      Descripcion: a.descripcion ?? "",
      Porcentaje: a.porcentaje_avance ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Avances");
    XLSX.writeFile(wb, `reporte_avances_${selectedEtapaId || "all"}.xlsx`);
  };

  // Descarga PDF
  const handleDownloadPDF = () => {
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

  // helpers para obtener id/nombre seguros del objeto 'proyecto' (porque tu API usa id_proyecto)
  const getProjectId = (p: any) => p?.id_proyecto ?? p?.id ?? p?.projectId ?? null;
  const getProjectName = (p: any) => p?.nombre ?? p?.name ?? p?.titulo ?? String(getProjectId(p));

  const getEtapaId = (e: any) => e?.id_etapa ?? e?.id ?? null;
  const getEtapaName = (e: any) => e?.nombre_etapa ?? e?.nombre ?? e?.name ?? String(getEtapaId(e));

  return (
    <div className="p-4">
      <div className="mb-5">
        <Header name="Reportes — Avances por Etapa" />
        <p className="text-sm text-gray-500">
          Consulta los avances por etapa. Filtra por proyecto, etapa y rango de fechas. Descarga en
          Excel o PDF.
        </p>
      </div>

      {/* filtros */}
      <div className="bg-white shadow rounded-lg p-6 mb-6 grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700">Proyecto</label>
          <select
            className="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 rounded-md"
            value={selectedProjectId}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedProjectId(val === "" ? "" : Number(val));
              setSelectedEtapaId(""); // limpiar etapa al cambiar proyecto
            }}
          >
            <option value="">— Seleccione proyecto —</option>
            {proyectos?.map((p: any) => {
              const id = getProjectId(p);
              const name = getProjectName(p);
              if (!id) return null;
              return (
                <option key={id} value={id}>
                  {name}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Etapa</label>
          <select
            className="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 rounded-md"
            value={selectedEtapaId}
            onChange={(e) => setSelectedEtapaId(e.target.value === "" ? "" : Number(e.target.value))}
            disabled={!selectedProjectId}
          >
            <option value="">— Seleccione etapa —</option>
            {etapas?.map((et: ReporteEtapaProyecto) => {
              const id = getEtapaId(et);
              const name = getEtapaName(et);
              if (!id) return null;
              return (
                <option key={id} value={id}>
                  {name}
                </option>
              );
            })}
          </select>
        </div>

        {/* fechas */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Desde</label>
          <input
            type="date"
            className="mt-1 block w-full pl-3 pr-3 py-2 border-gray-300 rounded-md"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Hasta</label>
          <input
            type="date"
            className="mt-1 block w-full pl-3 pr-3 py-2 border-gray-300 rounded-md"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {/* botones de export */}
        <div className="md:col-span-2 flex gap-2 justify-end">
          <button
            onClick={handleDownloadPDF}
            disabled={filteredAvances.length === 0}
            className="bg-red-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
          >
            Descargar PDF
          </button>
          <button
            onClick={handleDownloadExcel}
            disabled={filteredAvances.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
          >
            Descargar Excel
          </button>
        </div>
      </div>

      {/* resultados */}
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Fecha</th>
              <th className="px-4 py-2 text-left">Descripción</th>
              <th className="px-4 py-2 text-left">Porcentaje (%)</th>
            </tr>
          </thead>
          <tbody>
            {loadingAvances ? (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-center">Cargando avances...</td>
              </tr>
            ) : errorAvances ? (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-center text-red-500">Error cargando avances</td>
              </tr>
            ) : filteredAvances.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-center">No hay avances para los filtros seleccionados</td>
              </tr>
            ) : (
              filteredAvances.map((a: ReporteAvanceEtapa, i) => (
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
