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
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  Download,
  RefreshCw,
  FileText,
  Users,
  Package,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const COLORS = ["#4F46E5", "#F59E0B", "#10B981", "#EF4444", "#3B82F6"];

const SimpleReportes = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [selectedEtapaId, setSelectedEtapaId] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isClient, setIsClient] = useState(false);

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

  // ==== FUNCIONES DE DESCARGA ====
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

  const downloadPDF = (data: any[], title: string) => {
    if (!data || data.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(title, 14, 20);
    doc.setFontSize(12);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 28);

    doc.autoTable({
      startY: 35,
      head: [Object.keys(data[0])],
      body: data.map(Object.values),
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`${title}_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const handleForceRefresh = () => {
    refetchProyectos();
    refetchMateriales();
    refetchClientes();
    if (selectedProjectId) refetchEtapas();
    if (selectedEtapaId) refetchAvances();
  };

  const stats = [
    {
      title: "Materiales",
      value: repMateriales?.length || 0,
      icon: Package,
      color: "bg-purple-500",
      data: repMateriales,
    },
    {
      title: "Clientes",
      value: repClientes?.length || 0,
      icon: Users,
      color: "bg-orange-500",
      data: repClientes,
    },
  ];

  if (!isClient) return <div>Cargando...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Header name="Reportes del Sistema" />

        {/* REFRESH */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={handleForceRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
          >
            <RefreshCw size={16} />
            Recargar Todos los Datos
          </button>
        </div>

        {/* TARJETAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="text-white" size={24} />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => downloadExcel(stat.data, `reporte_${stat.title}`)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-900 text-white shadow hover:shadow-md text-sm"
                >
                  <Download size={16} /> Excel
                </button>
                <button
                  onClick={() => downloadPDF(stat.data, `Reporte de ${stat.title}`)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow hover:shadow-md text-sm"
                >
                  <FileText size={16} /> PDF
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* GRAFICOS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
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

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Clientes por ciudad</h3>
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

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Progreso de Avances</h3>
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

        {/* FILTROS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Filtros para Avances de Proyectos
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Proyecto</label>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value ? Number(e.target.value) : "");
                  setSelectedEtapaId("");
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
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
        </div>
      </div>
    </div>
  );
};

export default SimpleReportes;
