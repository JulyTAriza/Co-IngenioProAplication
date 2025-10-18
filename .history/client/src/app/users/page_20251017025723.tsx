"use client";

import { useState } from "react";
import { useGetUsersQuery, useDeleteUserMutation } from "@/state/api";
import Header from "@/app/(components)/Header";
import { DataGrid, GridColDef } from "@mui/x-data-grid"
import { Button } from "@mui/material";
import ConfirmDialog from "@/app/(components)/ConfirmDialog/page";
import UserModal from "./UsersModal";

// 🔹 Íconos desde lucide-react
import { UserPlus, Trash2 } from "lucide-react";

const columns: GridColDef[] = [
  { field: "id", headerName: "ID", width: 90 },
  { field: "username", headerName: "Nombre", width: 200 },
  { field: "e_mail", headerName: "Correo", width: 250 },
  { field: "rol", headerName: "Rol", width: 250 },
];

const Users = () => {
  const { data: users, isError, isLoading } = useGetUsersQuery();
  const [deleteUser] = useDeleteUserMutation();

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  const handleDelete = async () => {
    if (selectedUserId !== null) {
      await deleteUser(selectedUserId);
      setOpenConfirm(false);
    }
  };

  if (isLoading) return <div className="py-4">Cargando usuarios...</div>;
  if (isError || !users)
    return <div className="text-center text-red-500 py-4">Error al obtener los usuarios</div>;

  return (
    <div className="flex flex-col px-4">
      <Header name="Usuarios" />
      <div className="flex justify-end mt-4 gap-2">
        <Button
          variant="contained"
          startIcon={<UserPlus className="w-5 h-5" />}
          onClick={() => setOpenModal(true)}
        >
          Agregar
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<Trash2 className="w-5 h-5" />}
          disabled={!selectedUserId}
          onClick={() => setOpenConfirm(true)}
        >
          Eliminar
        </Button>
      </div>

      <div className="mt-5 h-[500px]">
        <DataGrid
          rows={users}
          columns={columns}
          getRowId={(row) => row.id}
          checkboxSelection
          onRowSelectionModelChange={(ids) => {
            const selectedId =
              Array.isArray(ids) && ids.length > 0 ? Number(ids[0]) : null;
            setSelectedUserId(selectedId);
          }}
          className="bg-white shadow rounded-lg border border-gray-200 !text-gray-700"
        />
      </div>

      <UserModal open={openModal} onClose={() => setOpenModal(false)} />

      <ConfirmDialog
        isOpen={openConfirm}
        title="¿Eliminar usuario?"
        message="Esta acción no se puede deshacer. ¿Deseas continuar?"
        onConfirm={handleDelete}
        onCancel={() => setOpenConfirm(false)}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </div>
  );
};

export default Users;

