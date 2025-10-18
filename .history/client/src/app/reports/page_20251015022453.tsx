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
import { Download, FileText, BarChart3, Users, Package, Calendar, Filter, ChevronDown } from "lucide-react";

const ReportesAvances: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [selectedEtapaId, setSelectedEtapaId] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tipoReporteExtra, setTipoReporteExtra] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"avances" | "otros">("avances");

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

  // --- FUNCIÓN AUXILIAR PARA EXCEL ---
  const s2ab = (s: string): ArrayBuffer => {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
    return buf;
  };

  // --- DESCARGAS ---
  const downloadExcel = (data: any[], fileName: string) => {
    try {
      if (!data || data.length === 0) {
        alert("No hay datos para descargar.");
        return;
      }

      // Limpiar datos para Excel
      const cleanData = data.map(item => {
        const cleanItem: any = {};
        Object.keys(item).forEach(key => {
          // Remover valores null/undefined y formatear fechas
          if (item[key] != null && item[key] !== '') {
            if (typeof item[key] === 'string' && item[key].match(/^\d{4}-\d{2}-\d{2}/)) {
              cleanItem[key] = formatDisplayDate(item[key]);
            } else {
              cleanItem[key] = item[key];
            }
          } else {
            cleanItem[key] = '-';
          }
        });
        return cleanItem;
      });

      const ws = XLSX.utils.json_to_sheet(cleanData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Reporte");

      // Generar el archivo Excel
      const wbout: string = XLSX.write(wb, { bookType: "xlsx", type: "string" });
      const blob = new Blob([s2ab(wbout)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error("Error al descargar Excel:", error);
      alert("Error al generar el archivo Excel. Por favor, intenta nuevamente.");
    }
  };

  const handleDownloadExcelAvances = () => {
    if (filteredAvances.length === 0) {
      alert("No hay datos de avances para descargar.");
      return;
    }
    const rows = filteredAvances.map((a) => ({
      Fecha: formatToISODate(a.fecha),
      Descripción: a.descripcion ?? "",
      'Porcentaje Avance': a.porcentaje_avance ?? "",
    }));
    downloadExcel(rows, `reporte_avances`);
  };

  const handleDownloadPDFAvances = () => {
    if (filteredAvances.length === 0) {
      alert("No hay datos de avances para descargar.");
      return;
    }
    
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(30, 64, 175);
      doc.text("Reporte de Avances", 40, 40);
      
      // Información del proyecto/etapa
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      const proyectoSeleccionado = proyectos.find((p: any) => p.id_proyecto === selectedProjectId);
      const etapaSeleccionada = etapas.find((e: any) => e.id_etapa === selectedEtapaId);
      
      let infoY = 65;
      if (proyectoSeleccionado) {
        doc.text(`Proyecto: ${proyectoSeleccionado.nombre}`, 40, infoY);
        infoY += 15;
      }
      if (etapaSeleccionada) {
        doc.text(`Etapa: ${etapaSeleccionada.nombre_etapa}`, 40, infoY);
        infoY += 15;
      }
      if (startDate || endDate) {
        doc.text(`Período: ${startDate ? formatDisplayDate(startDate) : 'Inicio'} - ${endDate ? formatDisplayDate(endDate) : 'Fin'}`, 40, infoY);
      }

      // Tabla
      autoTable(doc, {
        head: [["Fecha", "Descripción", "Porcentaje (%)"]],
        body: filteredAvances.map((a) => [
          formatDisplayDate(a.fecha),
          a.descripcion ?? "—",
          a.porcentaje_avance != null ? `${a.porcentaje_avance}%` : "—",
        ]),
        startY: infoY + 20,
        styles: { 
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: { 
          fillColor: [30, 64, 175],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        margin: { top: 20 }
      });

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Generado el ${new Date().toLocaleDateString('es-ES')} - Página ${i} de ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 20,
          { align: 'center' }
        );
      }

      doc.save(`reporte_avances_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("Error al generar el PDF. Por favor, intenta nuevamente.");
    }
  };

  // --- OBTENER DATOS DEL REPORTE EXTRA ---
  const getCurrentReportData = () => {
    switch (tipoReporteExtra) {
      case "materialesAll":
        return { 
          data: repMaterialesAll, 
          loading: loadingMaterialesAll, 
          error: errorMaterialesAll,
          title: "Materiales (Todos los proyectos)",
          columns: ['Nombre', 'Categoría', 'Cantidad', 'Proyecto']
        };
      case "materiales":
        return { 
          data: repMateriales, 
          loading: loadingMateriales, 
          error: errorMateriales, 
          requiresProject: true,
          title: "Materiales por Proyecto",
          columns: ['Nombre', 'Categoría', 'Cantidad', 'Etapa']
        };
      case "materialesEtapa":
        return { 
          data: repMaterialesEtapa, 
          loading: loadingMaterialesEtapa, 
          error: errorMaterialesEtapa, 
          requiresEtapa: true,
          title: "Materiales por Etapa",
          columns: ['Nombre', 'Categoría', 'Cantidad', 'Proveedor']
        };
      case "personalProyecto":
        return { 
          data: repPersonalProyecto, 
          loading: loadingPersonalProyecto, 
          error: errorPersonalProyecto, 
          requiresProject: true,
          title: "Personal por Proyecto",
          columns: ['Nombre', 'Rol', 'Email', 'Horas Asignadas']
        };
      case "estadosPersonal":
        return { 
          data: repEstadosPersonal, 
          loading: loadingEstadosPersonal, 
          error: errorEstadosPersonal,
          title: "Estados de Personal",
          columns: ['Nombre', 'Proyecto', 'Estado', 'Última Actualización']
        };
      case "clientes":
        return { 
          data: repClientes, 
          loading: loadingClientes, 
          error: errorClientes,
          title: "Reporte de Clientes",
          columns: ['Cliente', 'Proyectos', 'Contacto', 'Estado']
        };
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
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return alert("No hay datos disponibles para este reporte.");
    }

    const rows = Array.isArray(data) ? data : typeof data === "object" ? [data] : [];
    if (rows.length === 0) return alert("No hay datos válidos en este reporte.");

    downloadExcel(rows, `reporte_${tipoReporteExtra}`);
  };

  // --- RENDER BOTÓN DESCARGA ---
  const renderDownloadButton = () => {
    const reportInfo = getCurrentReportData();
    
    if (!tipoReporteExtra) {
      return (
        <button disabled className="flex items-center gap-2 bg-gray-300 text-gray-600 px-6 py-3 rounded-lg font-medium cursor-not-allowed">
          <Download size={18} />
          Selecciona un reporte
        </button>
      );
    }
    
    if (reportInfo?.loading) {
      return (
        <button disabled className="flex items-center gap-2 bg-blue-400 text-white px-6 py-3 rounded-lg font-medium cursor-not-allowed">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
          isDisabled 
            ? "bg-gray-300 text-gray-600 cursor-not-allowed" 
            : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
        }`}
      >
        <Download size={18} />
        Descargar Excel
      </button>
    );
  };

  // --- ESTADÍSTICAS RÁPIDAS ---
  const stats = [
    {
      title: "Total Avances",
      value: filteredAvances.length,
      icon: BarChart3,
      color: "bg-blue-500"
    },
    {
      title: "Proyectos Activos",
      value: proyectos.length,
      icon: FileText,
      color: "bg-green-500"
    },
    {
      title: "Etapas",
      value: etapas.length,
      icon: Package,
      color: "bg-purple-500"
    },
    {
      title: "Rango Fechas",
      value: startDate && endDate ? `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}` : "Todos",
      icon: Calendar,
      color: "bg-orange-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Header name="Reportes y Análisis" />

        {/* ESTADÍSTICAS RÁPIDAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="text-white" size={24} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* PESTAÑAS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab("avances")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "avances"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Reporte de Avances
              </button>
              <button
                onClick={() => setActiveTab("otros")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "otros"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Otros Reportes
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === "avances" && (
              <>
                {/* FILTROS AVANCES */}
                <div className="bg-blue-50 rounded-lg p-6 mb-6 border border-blue-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter size={20} className="text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Filtros de Avances</h3>
                  </div>
                  
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
                        <option value="">— Seleccione proyecto —</option>
                        {proyectos.map((p: any) => (
                          <option key={p.id_proyecto} value={p.id_proyecto}>
                            {p.nombre}
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
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fecha fin</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* BOTONES DESCARGA AVANCES */}
                <div className="flex gap-4 mb-6">
                  <button 
                    onClick={handleDownloadExcelAvances}
                    disabled={filteredAvances.length === 0}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                      filteredAvances.length === 0
                        ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl"
                    }`}
                  >
                    <Download size={18} />
                    Descargar Excel
                  </button>
                  <button 
                    onClick={handleDownloadPDFAvances}
                    disabled={filteredAvances.length === 0}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                      filteredAvances.length === 0
                        ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                        : "bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl"
                    }`}
                  >
                    <FileText size={18} />
                    Descargar PDF
                  </button>
                </div>

                {/* TABLA AVANCES */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-800">Registros de Avance</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {filteredAvances.length} registro(s) encontrado(s)
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
                        {filteredAvances.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                              <div className="flex flex-col items-center justify-center">
                                <BarChart3 size={48} className="text-gray-300 mb-2" />
                                <p>No hay avances registrados</p>
                                <p className="text-sm text-gray-400 mt-1">
                                  {!selectedEtapaId ? "Selecciona una etapa para ver los avances" : "No se encontraron registros con los filtros aplicados"}
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredAvances.map((a, i) => (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formatDisplayDate(a.fecha)}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600 max-w-md">
                                {a.descripcion ?? "—"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                  {a.porcentaje_avance ?? "—"}%
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab === "otros" && (
              <div className="space-y-6">
                {/* SELECTOR DE REPORTES EXTRA */}
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 size={20} className="text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Generar Reportes Adicionales</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Reporte
                      </label>
                      <select
                        value={tipoReporteExtra}
                        onChange={(e) => setTipoReporteExtra(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">— Seleccione tipo de reporte —</option>
                        <option value="materialesAll">Materiales (Todos los proyectos)</option>
                        <option value="materiales">Materiales por Proyecto</option>
                        <option value="materialesEtapa">Materiales por Etapa</option>
                        <option value="personalProyecto"> Personal por Proyecto</option>
                        <option value="estadosPersonal">Estados de Personal</option>
                        <option value="clientes">Clientes</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      {renderDownloadButton()}
                    </div>
                  </div>

                  {/* INFORMACIÓN DEL REPORTE SELECCIONADO */}
                  {tipoReporteExtra && (
                    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                      <h4 className="font-medium text-gray-800 mb-2">
                        {getCurrentReportData()?.title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {getCurrentReportData()?.requiresProject && "• Requiere selección de proyecto\n"}
                        {getCurrentReportData()?.requiresEtapa && "• Requiere selección de etapa\n"}
                        {getCurrentReportData()?.columns && `• Columnas: ${getCurrentReportData()?.columns.join(', ')}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportesAvances;