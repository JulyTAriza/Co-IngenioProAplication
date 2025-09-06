import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

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
  tagTypes: ["DashboardMetrics", "Material", "Users", "Expenses"],
  endpoints: (build) => ({
    getDashboardMetrics: build.query<DashboardMetrics, void>({
      query: () => "/dashboard",
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

getProyectoDetalle: build.query<
  any,
  number
>({
  query: (id) => `/projects/${id}`,
  transformResponse: (response: { success: boolean; data: any }) =>
    response.data,
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
}),

deleteProyecto: build.mutation<
  { success: boolean; message: string },
  number
>({
  query: (id) => ({
    url: `/projects/${id}`,
    method: "DELETE",
  }),
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


    getExpensesByCategory: build.query<ExpenseByCategorySummary[], void>({
      query: () => "/expenses",
      providesTags: ["Expenses"],
    }),

    login: build.mutation<
      { success: boolean; message: string; token?: string },
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
  
  useCreateProyectoMutation,
  useUpdateProyectoMutation,
  useDeleteProyectoMutation,
  useGetProyectosQuery,
  useGetProyectoDetalleQuery,
  useGetClientsQuery,
  useGetCitiesQuery,

} = api;
