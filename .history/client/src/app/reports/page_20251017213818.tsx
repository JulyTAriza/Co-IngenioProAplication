"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import Header from "@/app/(components)/Header";
import {
  useGetProyectosQuery,
  useGetReporteEtapasQuery,
  useGetReporteAvancesQuery,
  useGetReporteMaterialesQuery,
  useGetReporteClientesQuery,
  useGetReporteConsumoMaterialesQuery,
  useGetReporteResumenProyectoQuery,
  ReporteAvanceEtapa,
} from "@/state/api";
import { skipToken } from "@reduxjs/toolkit/query";
import * as XLSX from "xlsx";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import html2canvas from "html2canvas";
import {
  Download,
  RefreshCw,
  FileText,
  Users,
  Package,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

pdfMake.vfs = pdfFonts.vfs; // usar vfs correcto
// pdfMake.vfs ahora contiene las fuentes embebidas (Roboto) por defecto

const COLORS = ["#4F46E5", "#F59E0B", "#10B981", "#EF4444", "#3B82F6"];

const SimpleReportes = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [selectedEtapaId, setSelectedEtapaId] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isClient, setIsClient] = useState(false);

  // refs para capturar gráficos
  const chartMaterialesRef = useRef<HTMLDivElement | null>(null);
  const chartClientesRef = useRef<HTMLDivElement | null>(null);
  const chartAvancesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setIsClient(true), []);

  // ==== QUERIES ====
  const { data: proyectos = [], refetch: refetchProyectos } = useGetProyectosQuery({});
  const { data: etapas = [], refetch: refetchEtapas } = useGetReporteEtapasQuery(
    selectedProjectId !== "" ? Number(selectedProjectId) : skipToken
  );
  const { data: avances = [], refetch: refetchAvances } = useGetReporteAvancesQuery(
    selectedEtapaId !== "" ? Number(selectedEtapaId) : skipToken
  );
  const { data: repMateriales = [], refetch: refetchMateriales } = useGetReporteMaterialesQuery(undefined);
  const { data: repClientes = [], refetch: refetchClientes } = useGetReporteClientesQuery(undefined);

  // hooks de reportes por proyecto
  const { data: repConsumo = [], refetch: refetchConsumo } = useGetReporteConsumoMaterialesQuery(
    selectedProjectId !== "" ? Number(selectedProjectId) : skipToken
  );
  const { data: repResumen = [], refetch: refetchResumen } = useGetReporteResumenProyectoQuery(
    selectedProjectId !== "" ? Number(selectedProjectId) : skipToken
  );

  // ==== FILTROS ====
  const filteredAvances = useMemo(() => {
    const list = (avances ?? []) as ReporteAvanceEtapa[];
    if (!startDate && !endDate) return list;
    return list.filter((a) => {
      const fecha = a.fecha ? new Date(a.fecha).toISOString().split("T")[0] : "";
      const afterStart = !startDate || fecha >= startDate;
      const beforeEnd = !endDate || fecha <= endDate;
      return afterStart && beforeEnd;
    });
  }, [avances, startDate, endDate]);

  // ==== FUNCIONES AUX ====
  const handleForceRefresh = () => {
    refetchProyectos();
    refetchMateriales();
    refetchClientes();
    if (selectedProjectId) {
      refetchEtapas();
      refetchConsumo();
      refetchResumen();
    }
    if (selectedEtapaId) refetchAvances();
  };

  const downloadExcel = (data: any[], fileName: string) => {
    if (!data || data.length === 0) {
      alert("No hay datos para descargar.");
      return;
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = Object.keys(data[0]).map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // captura elemento DOM (gráfico) como imagen base64
  const captureElement = async (el: HTMLElement | null) => {
    if (!el) return null;
    const canvas = await html2canvas(el, { scale: 2 });
    return canvas.toDataURL("image/png");
  };

  // PDF consolidado (incluye gráficos y tablas generales)
  const downloadFullPDF = async () => {
    const imgMat = await captureElement(chartMaterialesRef.current);
    const imgCli = await captureElement(chartClientesRef.current);
    const imgAv = await captureElement(chartAvancesRef.current);

    // Construir body para tablas (si existen)
    const makeTableBody = (arr: any[]) => {
      if (!arr || arr.length === 0) return null;
      const headers = Object.keys(arr[0]);
      const body = [headers, ...arr.map((r) => headers.map((h) => String(r[h] ?? "")))];
      return body;
    };

    const docDefinition: any = {
      content: [
        { text: "Reporte Consolidado - Co-IngenioPro", style: "title" },
        { text: `Generado: ${new Date().toLocaleString()}`, style: "subtitle" },

        { text: "Materiales", style: "section" },
        imgMat ? { image: imgMat, width: 450, margin: [0, 8, 0, 8] } : null,
        makeTableBody(repMateriales) ? { table: { headerRows: 1, body: makeTableBody(repMateriales) }, layout: "lightHorizontalLines" } : { text: "No hay materiales.", margin: [0,6,0,6] },

        { text: "Clientes", style: "section", margin: [0, 12, 0, 0] },
        imgCli ? { image: imgCli, width: 450, margin: [0, 8, 0, 8] } : null,
        makeTableBody(repClientes) ? { table: { headerRows: 1, body: makeTableBody(repClientes) }, layout: "lightHorizontalLines" } : { text: "No hay clientes.", margin: [0,6,0,6] },

        { text: "Avances (filtro seleccionado)", style: "section", margin: [0, 12, 0, 0] },
        imgAv ? { image: imgAv, width: 450, margin: [0, 8, 0, 8] } : null,
        makeTableBody(filteredAvances) ? { table: { headerRows: 1, body: makeTableBody(filteredAvances) }, layout: "lightHorizontalLines" } : { text: "No hay avances.", margin: [0,6,0,6] },
      ],
      styles: {
        title: { fontSize: 18, bold: true, alignment: "center" },
        subtitle: { fontSize: 10, alignment: "center", color: "#4B5563", margin: [0,4,0,12] },
        section: { fontSize: 14, bold: true, margin: [0,8,0,6] },
      },
      defaultStyle: { font: "Roboto" }, // usar Roboto vendida en vfs
    };

    pdfMake.createPdf(docDefinition).download(`Reporte_Consolidado_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  // PDF por proyecto (tabla resumen + consumo)
  const downloadProjectPDF = async () => {
    if (!selectedProjectId) { alert("Selecciona un proyecto."); return; }
    const bodyResumen = (repResumen && repResumen.length>0) ? [Object.keys(repResumen[0]), ...repResumen.map((r:any)=>Object.values(r))] : null;
    const bodyConsumo = (repConsumo && repConsumo.length>0) ? [Object.keys(repConsumo[0]), ...repConsumo.map((r:any)=>Object.values(r))] : null;

    const docDefinition:any = {
      content: [
        { text: `Resumen del Proyecto ${selectedProjectId}`, style: "title" },
        { text: `Generado: ${new Date().toLocaleString()}`, style: "subtitle" },

        { text: "Resumen", style: "section" },
        bodyResumen ? { table: { headerRows:1, body: bodyResumen }, layout: "lightHorizontalLines" } : { text: "No hay resumen para este proyecto." },

        { text: "Consumo de Materiales", style: "section", margin:[0,12,0,0] },
        bodyConsumo ? { table: { headerRows:1, body: bodyConsumo }, layout: "lightHorizontalLines" } : { text: "No hay consumo registrado para este proyecto." },
      ],
      styles: {
        title: { fontSize: 18, bold: true, alignment: "center" },
        subtitle: { fontSize: 10, alignment: "center", color: "#4B5563", margin: [0,4,0,12] },
        section: { fontSize: 14, bold: true, margin: [0,8,0,6] },
      },
      defaultStyle: { font: "Roboto" }
    };

    pdfMake.createPdf(docDefinition).download(`Proyecto_${selectedProjectId}_Resumen_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  if (!isClient) return <div>Cargando...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Header name="Reportes del Sistema" />

        {/* botones globales */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <button onClick={handleForceRefresh} className="mr-3 px-4 py-2 bg-blue-600 text-white rounded">Recargar Todos</button>
            <button onClick={downloadFullPDF} className="px-4 py-2 bg-red-600 text-white rounded">Descargar PDF Consolidado</button>
          </div>

          <div>
            <button onClick={() => downloadExcel(repMateriales, "materiales")} className="px-3 py-2 bg-gray-800 text-white rounded mr-2">Excel materiales</button>
            <button onClick={() => downloadExcel(repClientes, "clientes")} className="px-3 py-2 bg-gray-800 text-white rounded">Excel clientes</button>
          </div>
        </div>

        {/* estadisticas simples */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-5 rounded shadow">
            <p className="text-sm text-gray-500">Materiales</p>
            <p className="text-2xl font-bold">{repMateriales?.length ?? 0}</p>
          </div>
          <div className="bg-white p-5 rounded shadow">
            <p className="text-sm text-gray-500">Clientes</p>
            <p className="text-2xl font-bold">{repClientes?.length ?? 0}</p>
          </div>
          <div className="bg-white p-5 rounded shadow">
            <p className="text-sm text-gray-500">Avances (filtrados)</p>
            <p className="text-2xl font-bold">{filteredAvances?.length ?? 0}</p>
          </div>
        </div>

        {/* gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div ref={chartMaterialesRef} id="chart-materiales" className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="font-semibold mb-3">Materiales más registrados</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={repMateriales.slice(0, 6)}>
                <XAxis dataKey="nombre" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#4F46E5" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div ref={chartClientesRef} id="chart-clientes" className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="font-semibold mb-3">Clientes por ciudad</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={repClientes} dataKey="id_cliente" nameKey="nombre" outerRadius={80}>
                  {repClientes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div ref={chartAvancesRef} id="chart-avances" className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="font-semibold mb-3">Progreso de Avances</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={filteredAvances}>
                <XAxis dataKey="fecha" />
                <YAxis dataKey="porcentaje_avance" />
                <Tooltip />
                <Line type="monotone" dataKey="porcentaje_avance" stroke="#10B981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* sección proyecto: filtros + descargas */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <h3 className="text-lg font-semibold mb-4">Reporte por Proyecto</h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label>Proyecto</label>
              <select value={selectedProjectId} onChange={(e) => { setSelectedProjectId(e.target.value ? Number(e.target.value) : ""); }}>
                <option value="">Seleccionar proyecto</option>
                {proyectos.map((p:any) => <option key={p.id_proyecto} value={p.id_proyecto}>{p.nombre}</option>)}
              </select>
            </div>

            <div>
              <label>Etapa</label>
              <select value={selectedEtapaId} onChange={(e)=> setSelectedEtapaId(e.target.value ? Number(e.target.value) : "")} disabled={!selectedProjectId}>
                <option value="">Seleccionar etapa</option>
                {etapas.map((et:any)=> <option key={et.id_etapa} value={et.id_etapa}>{et.nombre_etapa}</option>)}
              </select>
            </div>

            <div>
              <label>Fecha inicio</label>
              <input type="date" value={startDate} onChange={(e)=> setStartDate(e.target.value)} />
            </div>

            <div>
              <label>Fecha fin</label>
              <input type="date" value={endDate} onChange={(e)=> setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-3 justify-end mb-4">
            <button onClick={() => downloadExcel(repConsumo, `consumo_proyecto_${selectedProjectId}`)} className="px-4 py-2 bg-gray-800 text-white rounded">Excel Consumo</button>
            <button onClick={downloadProjectPDF} className="px-4 py-2 bg-red-600 text-white rounded">PDF Proyecto</button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead><tr>
                <th>Resumen</th>
              </tr></thead>
              <tbody>
                {repResumen && repResumen.length>0 ? repResumen.map((r:any, idx:number)=>(
                  <tr key={idx}><td>{JSON.stringify(r)}</td></tr>
                )) : <tr><td>No hay resumen</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SimpleReportes;

