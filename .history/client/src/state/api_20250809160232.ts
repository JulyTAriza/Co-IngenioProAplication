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
  userId: string;
  name: string;
  email: string;
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

    getUsers: build.query<User[], void>({
      query: () => "/users/",
      transformResponse: (response: { success: boolean; data: any[] }) =>
        response.data.map((u) => ({
          userId: u.id,
          name: u.username,
          email: u.e_mail,
        })),
      providesTags: ["Users"],
    }),

    createUser: build.mutation<
      User,
      { username: string; password: string; e_mail: string }
    >({
      query: (newUser) => ({
        url: "/users/",
        method: "POST",
        body: newUser,
      }),
      invalidatesTags: ["Users"],
    }),

    deleteUser: build.mutation<{ success: boolean }, number>({
      query: (id) => ({
        url: `/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users"],
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
  useCreateUserMutation,
  useDeleteUserMutation,
  useGetExpensesByCategoryQuery,
  useLoginMutation,
} = api;

