"use client";

import { useState } from "react";
import { 
  useGetUsersQuery, 
  useDeleteUserMutation, 
  useUpdateUserMutation 
} from "@/state/api";
import Header from "@/app/(components)/Header";
import { DataGrid, GridColDef, GridActionsCellItem } from "@mui/x-data-grid"
import { 
  Button, 
  Chip, 
  Menu, 
  MenuItem,
  Snackbar,
  Alert 
} from "@mui/material";
import ConfirmDialog from "@/app/(components)/ConfirmDialog/page";
import UserModal from "./UsersModal";

// 🔹 Íconos desde lucide-react
import { 
  UserPlus, 
  Trash2, 
  MoreVertical,
  Shield,
  User 
} from "lucide-react";

// Definir los roles permitidos
const ROLES_PERMITIDOS = ['Operario', 'Administrador'];

// Tipo para las notificaciones que incluya 'warning'
type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

const Users = () => {
  const { data: users, isError, isLoading, refetch } = useGetUsersQuery();
  const [deleteUser] = useDeleteUserMutation();
  const [updateUser] = useUpdateUserMutation();

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  
  // Estados para el menú de roles
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUserForRole, setSelectedUserForRole] = useState<any>(null);
  
  // Estados para notificaciones con tipo corregido
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: SnackbarSeverity;
  }>({
    open: false,
    message: "",
    severity: "success"
  });

  // Verificar si el usuario seleccionado es el admin principal (ID 1)
  const isMainAdminUser = selectedUserId === 1;

  const handleDelete = async () => {
    if (selectedUserId !== null && !isMainAdminUser) {
      try {
        await deleteUser(selectedUserId).unwrap();
        setSnackbar({
          open: true,
          message: "Usuario eliminado correctamente",
          severity: "success"
        });
        setOpenConfirm(false);
        setSelectedUserId(null);
      } catch (error) {
        setSnackbar({
          open: true,
          message: "Error al eliminar el usuario",
          severity: "error"
        });
      }
    }
  };

  const handleOpenConfirm = () => {
    if (isMainAdminUser) {
      setSnackbar({
        open: true,
        message: "No se puede eliminar el usuario administrador principal",
        severity: "warning"
      });
    } else {
      setOpenConfirm(true);
    }
  };

  const handleRoleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedUserForRole(user);
  };

  const handleRoleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUserForRole(null);
  };

  const handleRoleChange = async (nuevoRol: string) => {
    if (!selectedUserForRole) return;

    // Verificar que no sea el admin principal (ID 1)
    if (selectedUserForRole.id === 1) {
      setSnackbar({
        open: true,
        message: "No se puede modificar el rol del administrador principal",
        severity: "warning"
      });
      handleRoleMenuClose();
      return;
    }

    try {
      await updateUser({
        id: selectedUserForRole.id,
        data: { rol: nuevoRol }
      }).unwrap();

      setSnackbar({
        open: true,
        message: `Rol cambiado a ${nuevoRol} correctamente`,
        severity: "success"
      });
      
      // Recargar la lista de usuarios
      refetch();
    } catch (error: any) {
      const errorMessage = error?.data?.message || "Error al cambiar el rol";
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error"
      });
    } finally {
      handleRoleMenuClose();
    }
  };

  const getRoleChip = (rol: string, userId: number) => {
    const isMainAdmin = userId === 1;
    
    const color = isMainAdmin ? 'error' : 
                  rol === 'Administrador' ? 'error' : 'primary';
    
    const icon = isMainAdmin ? <Shield size={16} /> :
                 rol === 'Administrador' ? <Shield size={16} /> :
                 <User size={16} />;

    return (
      <Chip
        icon={icon}
        label={isMainAdmin ? 'Admin Principal' : rol}
        color={color}
        variant="filled"
        size="small"
        title={isMainAdmin ? 'Usuario administrador principal (no editable)' : ''}
      />
    );
  };

  const columns: GridColDef[] = [
    { 
      field: "id", 
      headerName: "ID", 
      width: 90 
    },
    { 
      field: "username", 
      headerName: "Nombre", 
      width: 200 
    },
    { 
      field: "e_mail", 
      headerName: "Correo", 
      width: 250 
    },
    { 
      field: "rol", 
      headerName: "Rol", 
      width: 150,
      renderCell: (params) => getRoleChip(params.value, params.row.id)
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Acciones",
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem
          key="change-role"  // ← CORRECCIÓN: AGREGADA PROP KEY
          icon={<MoreVertical size={18} />}
          label="Cambiar rol"
          onClick={(e) => handleRoleMenuOpen(e, params.row)}
          disabled={params.row.id === 1} // Solo deshabilitar para ID 1
          title={params.row.id === 1 ? "No se puede modificar el administrador principal" : "Cambiar rol"}
        />,
      ],
    },
  ];

  if (isLoading) return <div className="py-4">Cargando usuarios...</div>;
  if (isError || !users)
    return <div className="text-center text-red-500 py-4">Error al obtener los usuarios</div>;

  return (
    <div className="flex flex-col px-4">
      <Header name="Usuarios" />
      
      {/* Información sobre roles */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 text-sm text-blue-800">
          <Shield size={16} />
          <span>
            <strong>Nota:</strong> El usuario con <strong>ID 1 (Administrador Principal)</strong> no puede ser modificado o eliminado por seguridad del sistema.
          </span>
        </div>
      </div>

      <div className="flex justify-end mt-4 gap-2">
        <Button
          variant="contained"
          startIcon={<UserPlus className="w-5 h-5" />}
          onClick={() => setOpenModal(true)}
        >
          Agregar Usuario
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<Trash2 className="w-5 h-5" />}
          disabled={!selectedUserId || isMainAdminUser}
          onClick={handleOpenConfirm}
          title={isMainAdminUser ? "No se puede eliminar el administrador principal" : "Eliminar usuario seleccionado"}
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
            const selectedId = Array.isArray(ids) && ids.length > 0 ? Number(ids[0]) : null;
            setSelectedUserId(selectedId);
          }}
          className="bg-white shadow rounded-lg border border-gray-200 !text-gray-700"
        />
      </div>

      <UserModal 
        open={openModal} 
        onClose={() => setOpenModal(false)} 
        onUserCreated={() => {
          refetch();
          setSnackbar({
            open: true,
            message: "Usuario creado correctamente",
            severity: "success"
          });
        }}
      />

      {/* Menú para cambiar roles */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleRoleMenuClose}
      >
        <div className="px-3 py-2 text-sm text-gray-500 border-b">
          Cambiar rol de: <strong>{selectedUserForRole?.username}</strong>
        </div>
        {ROLES_PERMITIDOS.map((rol) => (
          <MenuItem
            key={rol}
            onClick={() => handleRoleChange(rol)}
            disabled={selectedUserForRole?.rol === rol}
            selected={selectedUserForRole?.rol === rol}
          >
            {getRoleChip(rol, selectedUserForRole?.id || 0)}
            {selectedUserForRole?.rol === rol && (
              <span className="ml-2 text-xs text-gray-500">(Actual)</span>
            )}
          </MenuItem>
        ))}
      </Menu>

      {/* ConfirmDialog sin la prop disabled */}
      <ConfirmDialog
        isOpen={openConfirm}
        title="¿Eliminar usuario?"
        message="Esta acción no se puede deshacer. ¿Deseas continuar?"
        onConfirm={handleDelete}
        onCancel={() => setOpenConfirm(false)}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Users;