"use client";

import React, { useState } from "react";
import {
  useGetInventorySummaryQuery,
  useGetStockAlertsQuery,
  useGetMaterialsConsumptionByProjectQuery,
  useGetTopUsedMaterialsQuery,
  useGetStockComparisonQuery,
} from "@/state/api";
import {
  Package,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  ShoppingCart,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const Inventory = () => {
  const { data: summary, isLoading: summaryLoading } = useGetInventorySummaryQuery();
  const { data: alerts, isLoading: alertsLoading } = useGetStockAlertsQuery();
  const { data: consumption, isLoading: consumptionLoading } = useGetMaterialsConsumptionByProjectQuery();
  const { data: topUsed, isLoading: topUsedLoading } = useGetTopUsedMaterialsQuery();
  const { data: comparison, isLoading: comparisonLoading } = useGetStockComparisonQuery();
  
  const [activeTab, setActiveTab] = useState<"alerts" | "consumption" | "topUsed" | "comparison">("alerts");

  if (summaryLoading) {
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
        <h1 className="text-3xl font-bold text-gray-800 mb-2">📦 Inventario de Materiales</h1>
        <p className="text-gray-600">Monitoreo exhaustivo de stock y consumo</p>
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
          onClick={() => setActiveTab("alerts")}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
            activeTab === "alerts"
              ? "bg-red-600 text-white shadow-lg"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
          Alertas de Stock
        </button>
        <button
          onClick={() => setActiveTab("consumption")}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
            activeTab === "consumption"
              ? "bg-blue-600 text-white shadow-lg"
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
              ? "bg-purple-600 text-white shadow-lg"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          Más Usados
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
      <div className="bg-white rounded-lg shadow-sm p-6">
        {/* ALERTAS DE STOCK */}
        {activeTab === "alerts" && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-6">⚠️ Alertas de Stock</h2>
            {alertsLoading ? (
              <p className="text-center text-gray-400 py-8">Cargando alertas...</p>
            ) : !alerts || alerts.length === 0 ? (
              <p className="text-center text-gray-400 py-8">
                ¡No hay alertas! Todos los materiales tienen stock suficiente 🎉
              </p>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`border-l-4 p-4 rounded-lg ${
                      alert.alertLevel === "critical"
                        ? "bg-red-50 border-red-500"
                        : alert.alertLevel === "warning"
                        ? "bg-yellow-50 border-yellow-500"
                        : "bg-blue-50 border-blue-500"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 text-lg">{alert.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                        <p className="text-sm font-medium mt-2">{alert.message}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-800">{alert.currentStock}</p>
                        <p className="text-sm text-gray-500">unidades</p>
                        <p className="text-xs text-gray-500 mt-1">
                          ${alert.unitPrice.toFixed(2)} c/u
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CONSUMO POR PROYECTO */}
        {activeTab === "consumption" && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-6">🏗️ Consumo por Proyecto</h2>
            {consumptionLoading ? (
              <p className="text-center text-gray-400 py-8">Cargando consumo...</p>
            ) : !consumption || consumption.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No hay datos de consumo</p>
            ) : (
              <div className="space-y-6">
                {consumption.map((project) => (
                  <div key={project.projectId} className="border rounded-lg p-5">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {project.projectName}
                      </h3>
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                        ${project.totalCost.toFixed(2)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {project.materials.map((material) => (
                        <div
                          key={material.materialId}
                          className="flex justify-between items-center bg-gray-50 p-3 rounded"
                        >
                          <div>
                            <p className="font-medium text-gray-800">{material.name}</p>
                            <p className="text-sm text-gray-600">
                              {material.estimatedQuantity} unidades × $
                              {material.unitCost.toFixed(2)}
                            </p>
                          </div>
                          <p className="font-semibold text-gray-800">
                            ${material.totalCost.toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TOP MATERIALES MÁS USADOS */}
        {activeTab === "topUsed" && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-6">🏆 Top Materiales Más Usados</h2>
            {topUsedLoading ? (
              <p className="text-center text-gray-400 py-8">Cargando...</p>
            ) : !topUsed || topUsed.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No hay datos</p>
            ) : (
              <div className="space-y-4">
                {topUsed.map((material, index) => (
                  <div
                    key={material.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-purple-100 text-purple-700 font-bold w-10 h-10 flex items-center justify-center rounded-full">
                        #{index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{material.name}</h3>
                        <p className="text-sm text-gray-600">
                          Usado en {material.projectsUsed} proyecto(s)
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-800">{material.totalUsed}</p>
                      <p className="text-sm text-gray-500">unidades usadas</p>
                      <p className="text-xs text-gray-500">
                        Stock actual: {material.currentStock}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* COMPARACIÓN STOCK */}
        {activeTab === "comparison" && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              📊 Stock Actual vs Estimado
            </h2>
            {comparisonLoading ? (
              <p className="text-center text-gray-400 py-8">Cargando comparación...</p>
            ) : !comparison || comparison.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No hay datos de comparación</p>
            ) : (
              <div className="space-y-4">
                {comparison.map((item) => (
                  <div
                    key={item.id}
                    className={`border-l-4 p-4 rounded-lg ${
                      item.status === "sufficient"
                        ? "bg-green-50 border-green-500"
                        : "bg-red-50 border-red-500"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-gray-800">{item.name}</h3>
                        <div className="flex gap-4 mt-2 text-sm">
                          <span className="text-gray-600">
                            Stock: <strong>{item.currentStock}</strong>
                          </span>
                          <span className="text-gray-600">
                            Estimado: <strong>{item.estimatedNeed}</strong>
                          </span>
                          <span
                            className={`font-medium ${
                              item.status === "sufficient"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            Diferencia: {item.difference > 0 ? "+" : ""}
                            {item.difference}
                          </span>
                        </div>
                      </div>
                      <div>
                        {item.status === "sufficient" ? (
                          <CheckCircle2 className="w-8 h-8 text-green-600" />
                        ) : (
                          <XCircle className="w-8 h-8 text-red-600" />
                        )}
                      </div>
                    </div>
                    {item.needsRestock && (
                      <div className="mt-3 bg-red-100 border border-red-200 rounded px-3 py-2 text-sm text-red-700 font-medium">
                        ⚠️ Requiere reabastecimiento urgente
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;