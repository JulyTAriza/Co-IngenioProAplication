"use client";

import { useGetMaterialsQuery } from "@/state/api";
import Header from "@/app/(components)/Header";
import { DataGrid, GridColDef } from "@mui/x-data-grid";

const columns: GridColDef[] = [
  { field: "id", headerName: "ID", width: 90 },
  { field: "nombre", headerName: "Nombre Del Material", width: 200 },
  {
    field: "precio_unitario",
    headerName: "Precio Por Unidad",
    width: 110,
    type: "number",
    valueGetter: (params: any) => {
      if (!params?.row?.precio_unitario) return "";
      return `$${params.row.precio_unitario}`;
    },
  },
  {
    field: "rating",
    headerName: "Rating",
    width: 110,
    type: "number",
    valueGetter: (params: any) => {
      if (!params?.row) return "N/A";
      return params.row.rating !== undefined ? params.row.rating : "N/A";
    },
  },
  {
    field: "cantidad",
    headerName: "Stock Quantity",
    width: 150,
    type: "number",
  },
];

const Inventory = () => {
  const { data: products, isError, isLoading } = useGetMaterialsQuery();

  if (isLoading) {
    return <div className="py-4">Loading...</div>;
  }

  if (isError || !products) {
    return (
      <div className="text-center text-red-500 py-4">
        Failed to fetch products
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header name="Inventory" />
      <DataGrid
        rows={products}
        columns={columns}
        checkboxSelection
        className="bg-white shadow rounded-lg border border-gray-200 mt-5 !text-gray-700"
      />
    </div>
  );
};

export default Inventory;
