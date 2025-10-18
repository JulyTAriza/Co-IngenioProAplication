"use client";

import React, { useState } from "react";
import {
  useGetMaterialsQuery,
  useGetInventorySummaryQuery,
  useGetStockAlertsQuery,
  useGetMaterialsConsumptionByProjectQuery,
  useGetTopUsedMaterialsQuery,
  useGetStockComparisonQuery,
} from "@/state/api";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  Package,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  Grid3x3,
  ArrowUp,
  ArrowDown,
  Award,
  Building,
  Calendar,
} from "lucide-react";

const Inventory = () => {
  const { data: materials, isLoading: materialsLoading } = useGetMaterialsQuery();
  const { data: summary, isLoading: summaryLoading } = useGetInventorySummaryQuery();
  const { data: alerts } = useGetStockAlertsQuery();
  const { data: consumption } = useGetMaterialsConsumptionByProjectQuery();
  const { data: topUsed } = useGetTopUsedMaterialsQuery();
  const { data: comparison } = useGetStockComparisonQuery();
  
  const [activeTab, setActiveTab] = useState<"grid" | "alerts" | "consumption" | "topUsed" | "comparison">("grid");

  // Columnas para vista general de materiales
  const materialsColumns: GridColDef[] = [
    { 
      field: "id", 
      headerName: "ID", 
      width: 80,
      headerClassName: "font-bold"
    },
    { 
      field: "nombre", 
      headerName: "Material", 
      width: 200,
      headerClassName: "font-bold",
      renderCell: (params) => (
        <div className="font-semibold text-gray-800">{params.value}</div>
      )
    },
    { 
      field: "descripcion", 
      headerName: "Descripción", 
      width: 280,
      headerClassName: "font-bold",
      renderCell: (params) => (
        <div className="text-gray-600">{params.value || "Sin descripción"}</div>
      )
    },
    {
      field: "cantidad",
      headerName: "Stock Actual",
      width: 130,
      type: "number",
      headerClassName: "font-bold",
      renderCell: (params) => (
        <div className="text-center">
          <span
            className={`font-bold text-lg ${
              params.value === 0
                ? "text-red-600"
                : params.value <= 5
                ? "text-yellow-600"
                : params.value <= 10
                ? "text-orange-600"
                : "text-green-600"
            }`}
          >
            {params.value}
          </span>
          <div className="text-xs text-gray-500">unidades</div>
        </div>
      ),
    },
    {
      field: "precio_unitario",
      headerName: "Precio Unitario",
      width: 150,
      type: "number",
      headerClassName: "font-bold",
      renderCell: (params) => (
        <div className="text-center">
          <span className="font-bold text-gray-800">${params.value?.toFixed(2) || "0.00"}</span>
        </div>
      ),
    },
    {
      field: "valor_total",
      headerName: "Valor Total",
      width: 150,
      type: "number",
      headerClassName: "font-bold",
      renderCell: (params) => {
        const total = (params.row.cantidad || 0) * (params.row.precio_unitario || 0);
        return (
          <div className="text-center">
            <span className="font-bold text-blue-600 text-lg">${total.toFixed(2)}</span>
          </div>
        );
      },
    },
    {
      field: "estado",
      headerName: "Estado",
      width: 130,
      headerClassName: "font-bold",
      renderCell: (params) => {
        const stock = params.row.cantidad;
        let label = "";
        let color = "";

        if (stock === 0) {
          label = "Agotado";
          color = "bg-red-100 text-red-700 border border-red-200";
        } else if (stock <= 5) {
          label = "Crítico";
          color = "bg-yellow-100 text-yellow-700 border border-yellow-200";
        } else if (stock <= 10) {
          label = "Bajo";
          color = "bg-orange-100 text-orange-700 border border-orange-200";
        } else {
          label = "Normal";
          color = "bg-green-100 text-green-700 border border-green-200";
        }

        return (
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${color}`}>
            {label}
          </span>
        );
      },
    },
  ];

  // Columnas para alertas de stock
  const alertsColumns: GridColDef[] = [
    { 
      field: "id", 
      headerName: "ID", 
      width: 80,
      headerClassName: "font-bold"
    },
    { 
      field: "name", 
      headerName: "Material", 
      width: 200,
      headerClassName: "font-bold",
      renderCell: (params) => (
        <div className="font-semibold text-gray-800">{params.value}</div>
      )
    },
    { 
      field: "description", 
      headerName: "Descripción", 
      width: 250,
      headerClassName: "font-bold",
      renderCell: (params) => (
        <div className="text-gray-600">{params.value || "Sin descripción"}</div>
      )
    },
    {
      field: "currentStock",
      headerName: "Stock Actual",
      width: 130,
      type: "number",
      headerClassName: "font-bold",
      renderCell: (params) => (
        <div className="text-center">
          <span className="text-2xl font-bold text-red-600">{params.value}</span>
          <div className="text-xs text-gray-500">unidades</div>
        </div>
      ),
    },
    {
      field: "unitPrice",
      headerName: "Precio Unitario",
      width: 140,
      type: "number",
      headerClassName: "font-bold",
      renderCell: (params) => (
        <div className="text-center">
          <span className="font-bold text-gray-800">${params.value?.toFixed(2) || "0.00"}</span>
        </div>
      ),
    },
    {
      field: "alertLevel",
      headerName: "Nivel de Alerta",
      width: 150,
      headerClassName: "font-bold",
      renderCell: (params) => {
        const level = params.value as string;
        const levels = {
          critical: { label: "Crítico", color: "bg-red-100 text-red-700 border border-red-200" },
          warning: { label: "Advertencia", color: "bg-yellow-100 text-yellow-700 border border-yellow-200" },
          info: { label: "Información", color: "bg-blue-100 text-blue-700 border border-blue-200" }
        };
        
        const levelConfig = levels[level as keyof typeof levels] || levels.info;
        
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${levelConfig.color}`}>
            {levelConfig.label}
          </span>
        );
      },
    },
    {
      field: "message",
      headerName: "Mensaje",
      width: 250,
      headerClassName: "font-bold",
      renderCell: (params) => (
        <div className="text-sm text-gray-700 font-medium">{params.value}</div>
      ),
    },
  ];

  // Columnas para consumo por proyecto
  const consumptionColumns: GridColDef[] = [
    { 
      field: "projectId", 
      headerName: "ID Proyecto", 
      width: 120,
      headerClassName: "font-bold"
    },
    { 
      field: "projectName", 
      headerName: "Proyecto", 
      width: 250,
      headerClassName: "font-bold",
      renderCell: (params) => (
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-gray-800">{params.value}</span>
        </div>
      )
    },
    {
      field: "totalCost",
      headerName: "Costo Total",
      width: 150,
      type: "number",
      headerClassName: "font-bold",
      renderCell: (params) => (
        <div className="text-center">
          <span className="font-bold text-green-600 text-lg">${params.value?.toFixed(2) || "0.00"}</span>
        </div>
      ),
    },
    {
      field: "materialsCount",
      headerName: "Materiales",
      width: 120,
      headerClassName: "font-bold",
      renderCell: (params) => (
        <div className="text-center">
          <span className="font-bold text-blue-600 text-lg">{params.value}</span>
          <div className="text-xs text-gray-500">materiales</div>
        </div>
      ),
    },
  ];

  // Columnas para top materiales más usados
  const topUsedColumns: GridColDef[] = [
    { 
      field: "ranking", 
      headerName: "#", 
      width: 80,
      headerClassName: "font-bold",
      renderCell: (params) => (
        <div className="flex items-center justify-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
            params.value === 1 ? "bg-yellow-100 text-yellow-700" :
            params.value === 2 ? "bg-gray-100 text-gray-700" :
            params.value === 3 ? "bg-orange-100 text-orange-700" :
            "bg-blue-100 text-blue-700"
          }`}>
            {params.value}
          </div>
        </div>
      )
    },
    { 
      field: "name", 
      headerName: "Material", 
      width: 250,
      headerClassName: "font-bold",
      renderCell: (params) => (
        <div className="font-semibold text-gray-800">{params.value}</div>
      )
    },
    {
      field: "totalUsed",
      headerName: "Total Usado",
      width: 140,
      type: "number",
      headerClassName: "font-bold",
      renderCell: (params) => (
        <div className="text-center">
          <span className="text-2xl font-bold text-orange-600">{params.value}</span>
          <div className="text-xs text-gray-500">unidades</div>
        </div>
      ),
    },
    {
      field: "currentStock",
      headerName: "Stock Actual",
      width: 140,
      type: "number",
      headerClassName: "font-bold",
      renderCell: (params) => (
        <div className="text-center">
          <span className={`text-lg font-bold ${
            params.value === 0 ? "text-red-600" :
            params.value <= 10 ? "text-yellow-600" :
            "text-green-600"
          }`}>
            {params.value}
          </span>
          <div className="text-xs text-gray-500">unidades</div>
        </div>
      ),
    },
    {
      field: "projectsUsed",
      headerName: "Proyectos",
      width: 120,
      type: "number",
      headerClassName: "font-bold",
      renderCell: (params) => (
        <div className="text-center">
          <span className="font-bold text-purple-600 text-lg">{params.value}</span>
          <div className="text-xs text-gray-500">proyectos</div>
        </div>
      ),
    },
    {
      field: "unitPrice",
      headerName: "Precio Unitario",
      width: 150,
      type: "number",
      headerClassName: "font-bold",
      renderCell: (params) => (
        <div className="text-center">
          <span className="font-bold text-gray-800">${params.value?.toFixed(2) || "0.00"}</span>
        </div>
      ),
    },
    {
      field: "totalValue",
      headerName: "Valor Total",
      width: 150,
      type: "number",
      headerClassName: "font-bold",
      renderCell: (params) => (
        <div className="text-center">
          <span className="font-bold text-green-600 text-lg">${params.value?.toFixed(2) || "0.00"}</span>
        </div>
      ),
    },
  ];

  // Columnas para la comparación stock vs estimado
  const comparisonColumns: GridColDef[] = [
    { 
      field: "name", 
      headerName: "Material", 
      width: 250,
      headerClassName: "font-bold",
      renderCell: (params) => (
        <div className="font-semibold text-gray-800">{params.value}</div>
      )
    },
    { 
      field: "currentStock", 
      headerName: "Stock Actual", 
      width: 140,
      type: "number",
      headerClassName: "font-bold",
      renderCell: (params) => (
        <div className="text-center">
          <div className="text-xl font-bold text-blue-600">{params.value}</div>
          <div className="text-xs text-gray-500">unidades</div>
        </div>
      )
    },
    { 
      field: "estimatedConsumption", 
      headerName: "Consumo Estimado", 
      width: 160,
      type: "number",
      headerClassName: "font-bold",
      renderCell: (params) => (
        <div className="text-center">
          <div className="text-xl font-bold text-orange-600">{params.value}</div>
          <div className="text-xs text-gray-500">unidades</div>
        </div>
      )
    },
    { 
      field: "difference", 
      headerName: "Diferencia", 
      width: 150,
      type: "number",
      headerClassName: "font-bold",
      renderCell: (params) => {
        const diff = params.value as number;
        const isPositive = diff >= 0;
        return (
          <div className="text-center">
            <div className={`flex items-center justify-center gap-1 text-xl font-bold ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}>
              {isPositive ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
              {isPositive ? "+" : ""}{diff}
            </div>
            <div className="text-xs text-gray-500">unidades</div>
          </div>
        );
      }
    },
    { 
      field: "status", 
      headerName: "Estado", 
      width: 150,
      headerClassName: "font-bold",
      renderCell: (params) => {
        const status = params.value as string;
        const isSufficient = status === "sufficient";
        return (
          <div className="flex items-center gap-2">
            {isSufficient ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <span className={`font-medium ${
              isSufficient ? "text-green-700" : "text-red-700"
            }`}>
              {isSufficient ? "Suficiente" : "Insuficiente"}
            </span>
          </div>
        );
      }
    },
    { 
      field: "needsRestock", 
      headerName: "Acción Requerida", 
      width: 180,
      headerClassName: "font-bold",
      renderCell: (params) => {
        const needsRestock = params.value as boolean;
        return (
          <div className={`px-3 py-2 rounded-full text-xs font-medium ${
            needsRestock 
              ? "bg-red-100 text-red-700 border border-red-200" 
              : "bg-green-100 text-green-700 border border-green-200"
          }`}>
            {needsRestock ? "🔴 Requiere Reabastecimiento" : "✅ Stock OK"}
          </div>
        );
      }
    },
  ];

  // Preparar datos para las grillas
  const consumptionData = consumption?.map(project => ({
    ...project,
    materialsCount: project.materials?.length || 0,
    id: project.projectId // Para DataGrid
  })) || [];

  const topUsedData = topUsed?.map((material, index) => ({
    ...material,
    ranking: index + 1,
    id: material.id // Para DataGrid
  })) || [];

  const alertsData = alerts?.map(alert => ({
    ...alert,
    id: alert.id // Para DataGrid
  })) || [];

  const comparisonData = comparison?.map(item => ({
    ...item,
    id: item.id // Para DataGrid
  })) || [];

  if (summaryLoading || materialsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  const summaryData = summary || {
    totalMaterials: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStock: 0,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Inventario de Materiales</h1>
        <p className="text-gray-600">Monitoreo de stock y consumo</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Materiales</p>
              <p className="text-3xl font-bold text-gray-800">{summaryData.totalMaterials}</p>
            </div>
            <div className="bg-blue-100 p-4 rounded-full">
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Valor Total</p>
              <p className="text-3xl font-bold text-gray-800">
                ${summaryData.totalValue.toLocaleString()}
              </p>
            </div>
            <div className="bg-green-100 p-4 rounded-full">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Stock Bajo</p>
              <p className="text-3xl font-bold text-gray-800">{summaryData.lowStockCount}</p>
            </div>
            <div className="bg-yellow-100 p-4 rounded-full">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Sin Stock</p>
              <p className="text-3xl font-bold text-gray-800">{summaryData.outOfStock}</p>
            </div>
            <div className="bg-red-100 p-4 rounded-full">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("grid")}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
            activeTab === "grid"
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Grid3x3 className="w-5 h-5" />
          Vista General
        </button>
        <button
          onClick={() => setActiveTab("alerts")}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
            activeTab === "alerts"
              ? "bg-red-600 text-white shadow-lg"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
          Alertas ({summaryData.lowStockCount})
        </button>
        <button
          onClick={() => setActiveTab("consumption")}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
            activeTab === "consumption"
              ? "bg-purple-600 text-white shadow-lg"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          <ShoppingCart className="w-5 h-5" />
          Consumo por Proyecto
        </button>
        <button
          onClick={() => setActiveTab("topUsed")}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
            activeTab === "topUsed"
              ? "bg-orange-600 text-white shadow-lg"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Award className="w-5 h-5" />
          Top Materiales
        </button>
        <button
          onClick={() => setActiveTab("comparison")}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
            activeTab === "comparison"
              ? "bg-green-600 text-white shadow-lg"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          Stock vs Estimado
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm">
        {/* VISTA GENERAL */}
        {activeTab === "grid" && (
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800">Todos los Materiales</h2>
              <p className="text-gray-600">Vista completa del inventario</p>
            </div>
            <DataGrid
              rows={materials || []}
              columns={materialsColumns}
              checkboxSelection
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 10 },
                },
              }}
              pageSizeOptions={[5, 10, 25, 50]}
              className="border-0"
              sx={{
                '& .MuiDataGrid-cell:focus': {
                  outline: 'none',
                },
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: '#f3f4f6',
                },
              }}
            />
          </div>
        )}

        {/* ALERTAS DE STOCK */}
        {activeTab === "alerts" && (
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800">Alertas de Stock</h2>
              <p className="text-gray-600">Materiales que requieren atención inmediata</p>
            </div>
            {alertsData.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">¡No hay alertas!</p>
                <p className="text-gray-400">Todos los materiales tienen stock suficiente</p>
              </div>
            ) : (
              <DataGrid
                rows={alertsData}
                columns={alertsColumns}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 10 },
                  },
                }}
                pageSizeOptions={[5, 10, 25, 50]}
                className="border-0"
                sx={{
                  '& .MuiDataGrid-cell:focus': {
                    outline: 'none',
                  },
                  '& .MuiDataGrid-row:hover': {
                    backgroundColor: '#f3f4f6',
                  },
                }}
              />
            )}
          </div>
        )}

        {/* CONSUMO POR PROYECTO */}
        {activeTab === "consumption" && (
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800">Consumo por Proyecto</h2>
              <p className="text-gray-600">Materiales estimados por proyecto</p>
            </div>
            {consumptionData.length === 0 ? (
              <div className="text-center py-12">
                <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No hay datos de consumo</p>
                <p className="text-gray-400">No se encontraron proyectos con materiales asignados</p>
              </div>
            ) : (
              <DataGrid
                rows={consumptionData}
                columns={consumptionColumns}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 10 },
                  },
                }}
                pageSizeOptions={[5, 10, 25, 50]}
                className="border-0"
                sx={{
                  '& .MuiDataGrid-cell:focus': {
                    outline: 'none',
                  },
                  '& .MuiDataGrid-row:hover': {
                    backgroundColor: '#f3f4f6',
                  },
                }}
              />
            )}
          </div>
        )}

        {/* TOP MATERIALES MÁS USADOS */}
        {activeTab === "topUsed" && (
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800">Top Materiales Más Usados</h2>
              <p className="text-gray-600">Materiales con mayor consumo en proyectos</p>
            </div>
            {topUsedData.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No hay datos</p>
                <p className="text-gray-400">No se encontraron materiales con uso registrado</p>
              </div>
            ) : (
              <DataGrid
                rows={topUsedData}
                columns={topUsedColumns}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 10 },
                  },
                  sorting: {
                    sortModel: [{ field: 'ranking', sort: 'asc' }],
                  },
                }}
                pageSizeOptions={[5, 10, 25, 50]}
                className="border-0"
                sx={{
                  '& .MuiDataGrid-cell:focus': {
                    outline: 'none',
                  },
                  '& .MuiDataGrid-row:hover': {
                    backgroundColor: '#f3f4f6',
                  },
                }}
                disableColumnMenu
                disableColumnFilter
                disableColumnSelector
              />
            )}
          </div>
        )}

        {/* COMPARACIÓN STOCK VS ESTIMADO */}
        {activeTab === "comparison" && (
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800">Stock Actual vs Consumo Estimado</h2>
              <p className="text-gray-600">Comparación entre inventario y necesidades de proyectos</p>
            </div>
            {comparisonData.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No hay datos de comparación</p>
                <p className="text-gray-400">No se encontraron materiales con consumo estimado</p>
              </div>
            ) : (
              <DataGrid
                rows={comparisonData}
                columns={comparisonColumns}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 10 },
                  },
                }}
                pageSizeOptions={[5, 10, 25, 50]}
                className="border-0"
                sx={{
                  '& .MuiDataGrid-cell:focus': {
                    outline: 'none',
                  },
                  '& .MuiDataGrid-row:hover': {
                    backgroundColor: '#f3f4f6',
                  },
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;