"use client";

import { useGetMaterialsQuery } from "@/state/api";
import Header from "@/app/(components)/Header";
import { DataGrid, GridColDef } from "@mui/x-data-grid";

const columns: GridColDef[] = [
  { field: "id", headerName: "ID", width: 90 },
  { field: "nombre", headerName: "Nombre Del Material", width: 200 },
  {
    field: "cantidad",
    headerName: "Cantidad En Stock",
    width: 150,
    type: "number",
  },
];

const Inventory = () => {
  const { data: products, isError, isLoading } = useGetMaterialsQuery();

  if (isLoading) {
    return <div className="py-4">Cargando...</div>;
  }

  if (isError || !products) {
    return (
      <div className="text-center text-red-500 py-4">
        Error al Cargar el Inventario
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
