"use client";

import { skipToken } from "@reduxjs/toolkit/query";
import {
  useGetReporteEtapasQuery,
  useGetReporteAvancesQuery,
  useGetReporteMaterialesQuery,
  useGetReporteMaterialesPorEtapaQuery,
  useGetReportePersonalProyectoQuery,
  useGetReporteEstadosPersonalQuery,
  useGetReporteClientesQuery,
  useGetReporteResumenProyectoQuery,
  useGetReporteConsumoMaterialesQuery,
} from "@/state/api";

export default function ReportsPage() {
  const projectId: number | undefined = 1; // cámbialo por el proyecto actual
  const etapaId: number | undefined = 2;   // cámbialo por la etapa actual

  // Etapas
  const {
    data: repEtapas,
    isLoading: loadingEtapas,
    isError: errorEtapas,
  } = useGetReporteEtapasQuery(projectId ? projectId : skipToken);

  // Avances
  const {
    data: repAvances,
    isLoading: loadingAvances,
    isError: errorAvances,
  } = useGetReporteAvancesQuery(etapaId ? etapaId : skipToken);

  // Materiales (sin parámetros)
  const {
    data: repMateriales,
    isLoading: loadingMateriales,
    isError: errorMateriales,
  } = useGetReporteMaterialesQuery();

  // Materiales por etapa
  const {
    data: repMaterialesEtapa,
    isLoading: loadingMaterialesEtapa,
    isError: errorMaterialesEtapa,
  } = useGetReporteMaterialesPorEtapaQuery(etapaId ? etapaId : skipToken);

  // Personal por proyecto
  const {
    data: repPersonal,
    isLoading: loadingPersonal,
    isError: errorPersonal,
  } = useGetReportePersonalProyectoQuery(projectId ? projectId : skipToken);

  // Estados de personal (sin parámetros)
  const {
    data: repEstadosPersonal,
    isLoading: loadingEstados,
    isError: errorEstados,
  } = useGetReporteEstadosPersonalQuery();

  // Clientes (sin parámetros)
  const {
    data: repClientes,
    isLoading: loadingClientes,
    isError: errorClientes,
  } = useGetReporteClientesQuery();

  // Resumen del proyecto
  const {
    data: repResumen,
    isLoading: loadingResumen,
    isError: errorResumen,
  } = useGetReporteResumenProyectoQuery(projectId ? projectId : skipToken);

  // Consumo de materiales
  const {
    data: repConsumoMateriales,
    isLoading: loadingConsumo,
    isError: errorConsumo,
  } = useGetReporteConsumoMaterialesQuery(projectId ? projectId : skipToken);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Reportes</h1>

      {/* Etapas */}
      <section>
        <h2 className="font-semibold">Etapas</h2>
        {loadingEtapas && <p>Cargando...</p>}
        {errorEtapas && <p>Error al cargar etapas</p>}
        {repEtapas && <pre>{JSON.stringify(repEtapas, null, 2)}</pre>}
      </section>

      {/* Avances */}
      <section>
        <h2 className="font-semibold">Avances</h2>
        {loadingAvances && <p>Cargando...</p>}
        {errorAvances && <p>Error al cargar avances</p>}
        {repAvances && <pre>{JSON.stringify(repAvances, null, 2)}</pre>}
      </section>

      {/* Materiales */}
      <section>
        <h2 className="font-semibold">Materiales</h2>
        {loadingMateriales && <p>Cargando...</p>}
        {errorMateriales && <p>Error al cargar materiales</p>}
        {repMateriales && <pre>{JSON.stringify(repMateriales, null, 2)}</pre>}
      </section>

      {/* Materiales por etapa */}
      <section>
        <h2 className="font-semibold">Materiales por etapa</h2>
        {loadingMaterialesEtapa && <p>Cargando...</p>}
        {errorMaterialesEtapa && <p>Error al cargar materiales por etapa</p>}
        {repMaterialesEtapa && (
          <pre>{JSON.stringify(repMaterialesEtapa, null, 2)}</pre>
        )}
      </section>

      {/* Personal */}
      <section>
        <h2 className="font-semibold">Personal</h2>
        {loadingPersonal && <p>Cargando...</p>}
        {errorPersonal && <p>Error al cargar personal</p>}
        {repPersonal && <pre>{JSON.stringify(repPersonal, null, 2)}</pre>}
      </section>

      {/* Estados de personal */}
      <section>
        <h2 className="font-semibold">Estados de personal</h2>
        {loadingEstados && <p>Cargando...</p>}
        {errorEstados && <p>Error al cargar estados</p>}
        {repEstadosPersonal && (
          <pre>{JSON.stringify(repEstadosPersonal, null, 2)}</pre>
        )}
      </section>

      {/* Clientes */}
      <section>
        <h2 className="font-semibold">Clientes</h2>
        {loadingClientes && <p>Cargando...</p>}
        {errorClientes && <p>Error al cargar clientes</p>}
        {repClientes && <pre>{JSON.stringify(repClientes, null, 2)}</pre>}
      </section>

      {/* Resumen del proyecto */}
      <section>
        <h2 className="font-semibold">Resumen del proyecto</h2>
        {loadingResumen && <p>Cargando...</p>}
        {errorResumen && <p>Error al cargar resumen</p>}
        {repResumen && <pre>{JSON.stringify(repResumen, null, 2)}</pre>}
      </section>

      {/* Consumo de materiales */}
      <section>
        <h2 className="font-semibold">Consumo de materiales</h2>
        {loadingConsumo && <p>Cargando...</p>}
        {errorConsumo && <p>Error al cargar consumo</p>}
        {repConsumoMateriales && (
          <pre>{JSON.stringify(repConsumoMateriales, null, 2)}</pre>
        )}
      </section>
    </div>
  );
}
