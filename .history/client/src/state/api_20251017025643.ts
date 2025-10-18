import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}


export interface Material {
  id: number;
  nombre: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
}

export interface NewMaterial {
  nombre: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
}

export interface SalesSummary {
  salesSummaryId: string;
  totalValue: number;
  changePercentage?: number;
  date: string;
}

export interface PurchaseSummary {
  purchaseSummaryId: string;
  totalPurchased: number;
  changePercentage?: number;
  date: string;
}

export interface ExpenseSummary {
  expenseSummarId: string;
  totalExpenses: number;
  date: string;
}

export interface ExpenseByCategorySummary {
  expenseByCategorySummaryId: string;
  category: string;
  amount: string;
  date: string;
}

export interface DashboardMetrics {
  popularMaterials: Material[];
  salesSummary: SalesSummary[];
  purchaseSummary: PurchaseSummary[];
  expenseSummary: ExpenseSummary[];
  expenseByCategorySummary: ExpenseByCategorySummary[];
}

export interface User {
  id: number;
  username: string;
  e_mail: string;
  rol : string;
}
export interface ProyectoEquipo {
  id_usuario: number;
  id_estado: number;
  rol: string;
}

export interface ProyectoMaterial {
  id_material: number;
  cantidad: number;
  unidad: string;
  costo_unitario: number;
  id_etapa?: number;
  nombre_etapa?: string;
}


export interface ProyectoEquipo {
  id_usuario: number;
  id_estado: number;
  rol: string;
}

export interface ProyectoMaterial {
  id_material: number;
  cantidad: number;
  unidad: string;
  costo_unitario: number;
  id_etapa?: number;
  nombre_etapa?: string;
}

export interface ProyectoPayload {
  nombre: string;
  descripcion?: string;
  nombre_ciudad: string;
  departamento?: string;
  nombre_cliente: string;
  email_cliente?: string;
  telefono_cliente?: string;
  direccion_cliente?: string;
  fecha_inicio: string;
  fecha_fin?: string;
  presupuesto?: number;
  equipo: ProyectoEquipo[];
  materiales: ProyectoMaterial[];
}
export interface ProyectoResponse {
  success: boolean;
  data?: {
    estado: string;
    mensaje: string;
    id_proyecto: number;
  };
  message?: string;
}

interface Client {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
}
export interface City {
  id: number;
  nombre: string;
  departamento: string;
}
export interface ProyectoResumen {
  id_proyecto: number;
  id_cliente: number | null;
  nombre: string;
  descripcion?: string;
  nombre_ciudad: string;
  departamento?: string;
  nombre_cliente: string;
  email_cliente?: string;
  telefono_cliente?: string;
  direccion_cliente?: string;
  fecha_inicio: string;
  fecha_fin?: string;
  presupuesto?: number;
  equipo?: ProyectoEquipo[];
  materiales?: ProyectoMaterial[];

  // alias opcionales para compatibilidad
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  cliente_email?: string;
  cliente_telefono?: string;
  cliente_direccion?: string;
  cliente?: {
    email?: string;
    telefono?: string;
    direccion?: string;
  };
}

// Interfaces de tipos de datos para la reportería
export interface ReporteAvanceEtapa {
  id_avance: number;
  fecha: string;
  descripcion: string;
  porcentaje_avance: number;
}

export interface ReporteEtapaProyecto {
  id_etapa: number;
  nombre_etapa: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
}

export interface ReporteMaterial {
  id: number;
  nombre: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
}

export interface ReporteMaterialEtapa {
  id_material_etapa: number;
  nombre_material: string;
  cantidad: number;
  unidad: string;
  costo_unitario: number;
}

export interface ReportePersonalProyecto {
  id_personal_proyecto: number;
  nombre_usuario: string;
  nombre_estado: string;
  rol: string;
}

export interface ReporteEstadoPersonal {
  id_estado: number;
  nombre_estado: string;
}

export interface ReporteCliente {
  id_cliente: number;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
}

export interface ReporteResumenProyecto {
  id_proyecto: number;
  nombre: string;
  descripcion: string;
  ciudad: string;
  cliente: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  presupuesto: number;
  fecha_creacion: string;
}

export interface ReporteConsumoMaterial {
  nombre_material: string;
  total_consumido: number;
  costo_promedio: number;
}

export interface Etapa {
  id_etapa: number;
  nombre: string;
  descripcion?: string;
  fecha_inicio: string; // "YYYY-MM-DD"
  fecha_fin: string;
  estado: string;
}

// Actividad dentro de una etapa
export interface Actividad {
  id_actividad: number;
  nombre: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  id_personal?: number;
  personal?: string; // Nombre del responsable
}

// Payload para crear actividad
export interface ActividadPayload {
  nombre: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  id_personal?: number;
}

// Vista Gantt completa (etapas + actividades)
export interface GanttEtapa {
  id_etapa: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  actividades: {
    id_actividad: number;
    nombre: string;
    fecha_inicio: string;
    fecha_fin: string;
    estado: string;
    personal?: string;      // ← AGREGAR ESTO
    id_personal?: number;   // ← AGREGAR ESTO
  }[];
}


export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("token");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["DashboardMetrics", "Material", "Users", "Expenses","Notifications", "Projects","ProjectDetail","Schedule"],
  endpoints: (build) => ({

  getDashboardMetrics: build.query<DashboardMetrics, void>({
  query: () => "/dashboard",
  transformResponse: (response: any) => {
    const payload = response?.data ?? response?.dashboard ?? response ?? {};

    return {
      popularMaterials:
        payload.popularMaterials ??
        payload.popular_materials ??
        payload.popularProducts ??
        payload.popular_products ??
        payload.materials ??
        [],
      salesSummary:
        payload.salesSummary ??
        payload.sales_summary ??
        payload.sales ??
        [],
      purchaseSummary:
        payload.purchaseSummary ??
        payload.purchase_summary ??
        payload.purchases ??
        [],
      expenseSummary:
        payload.expenseSummary ??
        payload.expense_summary ??
        payload.expenses ??
        [],
      expenseByCategorySummary:
        payload.expenseByCategorySummary ??
        payload.expense_by_category_summary ??
        payload.expenseByCategory ??
        [],
    } as DashboardMetrics;
  },
  providesTags: ["DashboardMetrics"],
}),

    getMaterials: build.query<Material[], void>({
      query: () => "/materials/",
      transformResponse: (response: { success: boolean; data: Material[] }) =>
        response.data,
      providesTags: ["Material"],
    }),

    createMaterial: build.mutation<Material, NewMaterial>({
      query: (newMaterial) => ({
        url: "/materials/",
        method: "POST",
        body: newMaterial,
      }),
      invalidatesTags: ["Material"],
    }),

    updateMaterial: build.mutation<
      Material,
      { id: number; data: NewMaterial }
    >({
      query: ({ id, data }) => ({
        url: `/materials/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Material"],
    }),

    deleteMaterial: build.mutation<{ success: boolean }, number>({
      query: (id) => ({
        url: `/materials/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Material"],
    }),

  createUser: build.mutation<User, { username: string; password: string; e_mail: string }>({
  query: (newUser) => ({
    url: "/usuarios/",
    method: "POST",
    body: newUser,
  }),
  invalidatesTags: ["Users"],
}),

deleteUser: build.mutation<{ success: boolean }, number>({
  query: (id) => ({
    url: `/usuarios/${id}`,
    method: "DELETE",
  }),
  invalidatesTags: ["Users"],
}),


 getUsers: build.query<User[], void>({
  query: () => "/usuarios/",
  transformResponse: (response: { success: boolean; data: User[] }) => response.data,
  providesTags: ["Users"],
}),

    getProyectoDetalle: build.query<ProyectoResumen, number>({
      query: (id) => `/projects/${id}`,
      transformResponse: (response: { success: boolean; data: ProyectoResumen }) =>
        response.data,
      providesTags: (result, error, id) => [{ type: 'ProjectDetail', id }], // ← Agregar tag específico
    }),
// --- NOTIFICACIONES ---
getNotifications: build.query<Notification[], string>({
  
  query: (username) => `api/notifications/user/${username}?limit=10`, 
transformResponse: (response: any) => {
  if (Array.isArray(response)) return response;
  if (response?.data) return response.data;
  if (response?.notifications) return response.notifications;
  return [];
},

  // Tag para invalidar cache automáticamente
  providesTags: ["Notifications"],
}),



createNotification: build.mutation<
  { message: string },
  { user_id: number; title: string; message: string }
>({
  query: (newNotif) => ({
    url: "/api/notifications/",
    method: "POST",
    body: newNotif,
  }),
  invalidatesTags: ["Notifications"],
}),


markNotificationAsRead: build.mutation<{ message: string }, number>({
  query: (notifId) => ({
    url: `/api/notifications/${notifId}/read`,
    method: "PUT",
  }),
  invalidatesTags: ["Notifications"],
}),


    getProyectos: build.query<
      any[],
      { estado?: string; id_cliente?: number; id_ciudad?: number }
    >({
      query: (params) => {
        const queryString = new URLSearchParams(params as any).toString();
        return `/projects/?${queryString}`;
      },
      transformResponse: (response: { success: boolean; data: any[] }) =>
        response.data,
      providesTags: ['Projects'], // ← Agregar tag
    }),

    deleteProyecto: build.mutation<
      { success: boolean; message: string },
      number
    >({
      query: (id) => ({
        url: `/projects/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ['Projects'], // ← Agregar invalidación
    }),

  updateProyecto: build.mutation<
      { success: boolean; message: string },
      { id: number; data: any }
    >({
      query: ({ id, data }) => ({
        url: `/projects/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        'Projects', 
        { type: 'ProjectDetail', id }
      ], // ← Agregar invalidación específica
    }),

    createProyecto: build.mutation<
      { success: boolean; data?: any; message?: string },
      any
    >({
      query: (nuevoProyecto) => ({
        url: "/projects/",
        method: "POST",
        body: nuevoProyecto,
      }),
      invalidatesTags: ['Projects'], // ← Agregar invalidación
    }),


getClients: build.query<Client[], void>({
  query: () => "/projects/clientes",
  transformResponse: (response: { success: boolean; data: Client[] }) =>
    response.data,
}),

getCities: build.query<City[], void>({
  query: () => "/projects/ciudades",
  transformResponse: (response: { success: boolean; data: City[] }) =>
    response.data,
}),

// --- REPORTES ---
getReporteAvances: build.query<ReporteAvanceEtapa[], number>({
  query: (id_etapa) => `/reports/avances/${id_etapa}`,
  transformResponse: (response: { success: boolean; data: ReporteAvanceEtapa[] }) =>
    response.data,
}),

getReporteEtapas: build.query<ReporteEtapaProyecto[], number>({
  query: (id_proyecto) => `/reports/etapas/${id_proyecto}`,
  transformResponse: (response: { success: boolean; data: ReporteEtapaProyecto[] }) =>
    response.data,
}),

getReporteMateriales: build.query<ReporteMaterial[], void>({
  query: () => `/reports/materiales`,
  transformResponse: (response: { success: boolean; data: ReporteMaterial[] }) =>
    response.data,
}),

getReporteMaterialesPorEtapa: build.query<ReporteMaterialEtapa[], number>({
  query: (id_etapa) => `/reports/materiales/etapa/${id_etapa}`,
  transformResponse: (response: { success: boolean; data: ReporteMaterialEtapa[] }) =>
    response.data,
}),

getReportePersonalProyecto: build.query<ReportePersonalProyecto[], number>({
  query: (id_proyecto) => `/reports/personal/${id_proyecto}`,
  transformResponse: (response: { success: boolean; data: ReportePersonalProyecto[] }) =>
    response.data,
}),

getReporteEstadosPersonal: build.query<ReporteEstadoPersonal[], void>({
  query: () => `/reports/estados-personal`,
  transformResponse: (response: { success: boolean; data: ReporteEstadoPersonal[] }) =>
    response.data,
}),

getReporteClientes: build.query<ReporteCliente[], void>({
  query: () => `/reports/clientes`,
  transformResponse: (response: { success: boolean; data: ReporteCliente[] }) =>
    response.data,
}),

getReporteResumenProyecto: build.query<ReporteResumenProyecto[], number>({
  query: (id_proyecto) => `/reports/resumen/${id_proyecto}`,
  transformResponse: (response: { success: boolean; data: ReporteResumenProyecto[] }) =>
    response.data,
}),

getReporteConsumoMateriales: build.query<ReporteConsumoMaterial[], number>({
  query: (id_proyecto) => `/reports/consumo-materiales/${id_proyecto}`,
  transformResponse: (response: { success: boolean; data: ReporteConsumoMaterial[] }) =>
    response.data,
}),

// ← CRONOGRAMA

getEtapasProyecto: build.query<Etapa[], number>({
  query: (id_proyecto) => `/schedule/${id_proyecto}/etapas`,
  transformResponse: (response: { success: boolean; data: Etapa[] }) =>
    response.data,
  providesTags: (result, error, id_proyecto) => [
    { type: 'Schedule', id: `proyecto-${id_proyecto}` }
  ],
}),

// 📌 Listar actividades de una etapa
getActividadesEtapa: build.query<Actividad[], number>({
  query: (id_etapa) => `/schedule/etapas/${id_etapa}/actividades`,
  transformResponse: (response: { success: boolean; data: Actividad[] }) =>
    response.data,
  providesTags: (result, error, id_etapa) => [
    { type: 'Schedule', id: `etapa-${id_etapa}` }
  ],
}),

// 📌 Crear nueva actividad
createActividad: build.mutation<
  { success: boolean; message: string },
  { id_etapa: number; data: ActividadPayload }
>({
  query: ({ id_etapa, data }) => ({
    url: `/schedule/etapas/${id_etapa}/actividades`,
    method: "POST",
    body: data,
  }),
  invalidatesTags: (result, error, { id_etapa }) => [
    { type: 'Schedule', id: `etapa-${id_etapa}` }
  ],
}),

// 📌 Actualizar actividad
updateActividad: build.mutation<
  { success: boolean; message: string },
  { id_actividad: number; data: Partial<ActividadPayload> }
>({
  query: ({ id_actividad, data }) => ({
    url: `/schedule/actividades/${id_actividad}`,
    method: "PUT",
    body: data,
  }),
  invalidatesTags: ['Schedule'],
}),

// 📌 Eliminar actividad
deleteActividad: build.mutation<
  { success: boolean; message: string },
  number
>({
  query: (id_actividad) => ({
    url: `/schedule/actividades/${id_actividad}`,
    method: "DELETE",
  }),
  invalidatesTags: ['Schedule'],
}),

// 📌 Vista Gantt completa del proyecto
getGanttProyecto: build.query<GanttEtapa[], number>({
  query: (id_proyecto) => `/schedule/${id_proyecto}/gantt`,
  transformResponse: (response: { success: boolean; data: GanttEtapa[] }) =>
    response.data,
  providesTags: (result, error, id_proyecto) => [
    { type: 'Schedule', id: `gantt-${id_proyecto}` }
  ],
}),

register: build.mutation<
  { success: boolean; message: string; token?: string },
  { username: string; password: string; e_mail: string }
>({
  query: (newUser) => ({
    url: "/register",
    method: "POST",
    body: newUser,
  }),
}),


    getExpensesByCategory: build.query<ExpenseByCategorySummary[], void>({
      query: () => "/expenses",
      providesTags: ["Expenses"],
    }),

    login: build.mutation<
        { 
    success: boolean; 
    message: string; 
    token?: string;
    usuario?: {
      id: number;
      username: string;
      email: string;
      rol: string;
    };
  },
      { username: string; password: string }
    >({
      query: (credentials) => ({
        url: "/login",
        method: "POST",
        body: credentials,
      }),
    }),
  }),
});

export const {
  useGetDashboardMetricsQuery,
  useGetMaterialsQuery,
  useCreateMaterialMutation,
  useUpdateMaterialMutation,
  useDeleteMaterialMutation,
  useGetUsersQuery,
  useGetExpensesByCategoryQuery,
  useLoginMutation,
  useCreateUserMutation,
  useDeleteUserMutation,
  useRegisterMutation,
  useCreateProyectoMutation,
  useUpdateProyectoMutation,
  useDeleteProyectoMutation,
  useGetProyectosQuery,
  useGetProyectoDetalleQuery,
  useGetClientsQuery,
  useGetCitiesQuery,
  useGetReporteAvancesQuery,
  useGetReporteEtapasQuery,
  useGetReporteMaterialesQuery,
  useGetReporteMaterialesPorEtapaQuery,
  useGetReportePersonalProyectoQuery,
  useGetReporteEstadosPersonalQuery,
  useGetReporteClientesQuery,
  useGetReporteResumenProyectoQuery,
  useGetReporteConsumoMaterialesQuery,
  useGetNotificationsQuery,
  useCreateNotificationMutation,
  useMarkNotificationAsReadMutation,
  useGetEtapasProyectoQuery,
 useGetActividadesEtapaQuery,
 useCreateActividadMutation,
 useUpdateActividadMutation,
 useDeleteActividadMutation,
 useGetGanttProyectoQuery,


} = api;
