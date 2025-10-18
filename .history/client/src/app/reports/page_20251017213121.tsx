"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
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

pdfMake.vfs = pdfFonts.pdfMake.vfs;

const COLORS = ["#4F46E5", "#F59E0B", "#10B981", "#EF4444", "#3B82F6"];

const SimpleReportes = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [selectedEtapaId, setSelectedEtapaId] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isClient, setIsClient] = useState(false);

  // Referencias de los gráficos para capturar imágenes
  const chartMaterialesRef = useRef<HTMLDivElement>(null);
  const chartClientesRef = useRef<HTMLDivElement>(null);
  const chartAvancesRef = useRef<HTMLDivElement>(null);

  useEffect(() => setIsClient(true), []);

  // === QUERIES ===
  const { data: proyectos = [], refetch: refetchProyectos } = useGetProyectosQuery({});
  const { data: etapas = [], refetch: refetchEtapas } = useGetReporteEtapasQuery(
    selectedProjectId !== "" ? Number(selectedProjectId) : skipToken
  );
  const { data: avances = [], refetch: refetchAvances } = useGetReporteAvancesQuery(
    selectedEtapaId !== "" ? Number(selectedEtapaId) : skipToken
  );
  const { data: repMateriales = [], refetch: refetchMateriales } = useGetReporteMaterialesQuery(undefined);
  const { data: repClientes = [], refetch: refetchClientes } = useGetReporteClientesQuery(undefined);

  // === FILTROS ===
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

  // === FUNCIONES ===
  const handleForceRefresh = () => {
    refetchProyectos();
    refetchMateriales();
    refetchClientes();
    if (selectedProjectId) refetchEtapas();
    if (selectedEtapaId) refetchAvances();
  };

  const downloadExcel = (data: any[], fileName: string) => {
    if (!data || data.length === 0) {
      alert("No hay datos para descargar.");
      return;
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const captureChartAsImage = async (element: HTMLDivElement | null) => {
    if (!element) return null;
    const canvas = await html2canvas(element);
    return canvas.toDataURL("image/png");
  };

  const downloadFullReportPDF = async () => {
    const imgMateriales = await captureChartAsImage(chartMaterialesRef.current);
    const imgClientes = await captureChartAsImage(chartClientesRef.current);
    const imgAvances = await captureChartAsImage(chartAvancesRef.current);

    const docDefinition: any = {
      content: [
        { text: "Reporte Consolidado del Sistema", style: "header" },
        { text: `Generado: ${new Date().toLocaleDateString()}`, style: "subheader" },

        { text: "📦 Materiales", style: "sectionTitle" },
        imgMateriales ? { image: imgMateriales, width: 450, margin: [0, 10, 0, 10] } : {},
        repMateriales.length > 0
          ? {
              table: {
                headerRows: 1,
                body: [
                  Object.keys(repMateriales[0]),
                  ...repMateriales.map((m: any) => Object.values(m)),
                ],
              },
              layout: "lightHorizontalLines",
            }
          : { text: "No hay materiales registrados.", margin: [0, 0, 0, 10] },

        { text: "👥 Clientes", style: "sectionTitle", margin: [0, 20, 0, 0] },
        imgClientes ? { image: imgClientes, width: 450, margin: [0, 10, 0, 10] } : {},
        repClientes.length > 0
          ? {
              table: {
                headerRows: 1,
                body: [
                  Object.keys(repClientes[0]),
                  ...repClientes.map((c: any) => Object.values(c)),
                ],
              },
              layout: "lightHorizontalLines",
            }
          : { text: "No hay clientes registrados.", margin: [0, 0, 0, 10] },

        { text: "📊 Avances de Proyecto", style: "sectionTitle", margin: [0, 20, 0, 0] },
        imgAvances ? { image: imgAvances, width: 450, margin: [0, 10, 0, 10] } : {},
        filteredAvances.length > 0
          ? {
              table: {
                headerRows: 1,
                body: [
                  Object.keys(filteredAvances[0]),
                  ...filteredAvances.map((a: any) => Object.values(a)),
                ],
              },
              layout: "lightHorizontalLines",
            }
          : { text: "No hay avances registrados.", margin: [0, 0, 0, 10] },
      ],
      styles: {
        header: { fontSize: 20, bold: true, margin: [0, 0, 0, 10] },
        subheader: { fontSize: 11, color: "#6B7280", margin: [0, 0, 0, 10] },
        sectionTitle: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
      },
      defaultStyle: { font: "Helvetica" },
    };

    pdfMake.createPdf(docDefinition).download("Reporte_Completo.pdf");
  };

  // === RENDER ===
  if (!isClient) return <div>Cargando...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Header name="Reportes del Sistema" />

        {/* BOTÓN GLOBAL */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={handleForceRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition"
          >
            <RefreshCw size={16} /> Recargar Datos
          </button>

          <button
            onClick={downloadFullReportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm transition"
          >
            <FileText size={16} /> Descargar PDF Completo
          </button>
        </div>

        {/* GRAFICOS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div ref={chartMaterialesRef} className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Materiales más registrados</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={repMateriales.slice(0, 5)}>
                <XAxis dataKey="nombre" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#4F46E5" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div ref={chartClientesRef} className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Clientes por Ciudad</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={repClientes}
                  dataKey="id_cliente"
                  nameKey="nombre"
                  outerRadius={80}
                >
                  {repClientes.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div ref={chartAvancesRef} className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Avances de Proyectos</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={filteredAvances}>
                <XAxis dataKey="fecha" />
                <YAxis dataKey="porcentaje_avance" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="porcentaje_avance"
                  stroke="#10B981"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleReportes;
