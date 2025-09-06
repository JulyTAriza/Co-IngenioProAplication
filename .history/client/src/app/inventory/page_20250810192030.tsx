"use client";

import { useGetMaterialsQuery } from "@/state/api";
import Header from "@/app/(components)/Header";
import { DataGrid, GridColDef } from "@mui/x-data-grid";

const columns: GridColDef[] = [
  { field: "id", headerName: "ID", width: 90 },
  { field: "nombre", headerName: "Material Name", width: 200 },
  {
    field: "precio_unitario",
    headerName: "Price",
    width: 110,
    type: "number",
    valueGetter: (params: { row: { precio_unitario: number } }) =>
      `$${params.row.precio_unitario}`,
  },
  {
    field: "rating", // si no está, puedes quitar esta columna o manejarla
    headerName: "Rating",
    width: 110,
    type: "number",
    valueGetter: (params: { row: { rating?: number } }) =>
      params.row.rating ? params.row.rating : "N/A",
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
