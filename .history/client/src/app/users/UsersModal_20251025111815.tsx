"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  TextField, 
  DialogActions, 
  Button,
  Alert,
  CircularProgress,
  Box
} from "@mui/material";
import { useCreateUserMutation } from "@/state/api";

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  onUserCreated?: () => void;
}

const UserModal = ({ open, onClose, onUserCreated }: UserModalProps) => {
  const [form, setForm] = useState({ 
    username: "", 
    password: "", 
    e_mail: "" 
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [createUser, { isLoading, error }] = useCreateUserMutation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // Validar nombre de usuario
    if (!form.username.trim()) {
      newErrors.username = "El nombre de usuario es requerido";
    } else if (form.username.length < 3) {
      newErrors.username = "El nombre debe tener al menos 3 caracteres";
    }

    // Validar email
    if (!form.e_mail.trim()) {
      newErrors.e_mail = "El correo electrónico es requerido";
    } else if (!/\S+@\S+\.\S+/.test(form.e_mail)) {
      newErrors.e_mail = "El formato del correo no es válido";
    }

    // Validar contraseña
    if (!form.password) {
      newErrors.password = "La contraseña es requerida";
    } else if (form.password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await createUser(form).unwrap();
      
      // Limpiar formulario
      setForm({ username: "", password: "", e_mail: "" });
      setErrors({});
      
      // Cerrar modal y ejecutar callback
      onClose();
      
      // Notificar al componente padre que se creó un usuario
      if (onUserCreated) {
        onUserCreated();
      }
      
    } catch (err) {
      // El error ya es manejado por el estado de la mutation
      console.error("Error creating user:", err);
    }
  };

  const handleClose = () => {
    // Limpiar formulario y errores al cerrar
    setForm({ username: "", password: "", e_mail: "" });
    setErrors({});
    onClose();
  };

  // Obtener mensaje de error de la mutation
  const getErrorMessage = () => {
    if (error) {
      // @ts-ignore - RTK Query error structure
      return error.data?.message || "Error al crear el usuario";
    }
    return null;
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Crear Nuevo Usuario</DialogTitle>
      <DialogContent>
        {/* Mostrar error general de la mutation */}
        {getErrorMessage() && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {getErrorMessage()}
          </Alert>
        )}

        <TextField 
          label="Nombre de usuario" 
          name="username" 
          fullWidth 
          margin="dense" 
          value={form.username}
          onChange={handleChange}
          error={!!errors.username}
          helperText={errors.username}
          disabled={isLoading}
          placeholder="Ej: juan.perez"
        />
        
        <TextField 
          label="Correo electrónico" 
          name="e_mail" 
          type="email"
          fullWidth 
          margin="dense" 
          value={form.e_mail}
          onChange={handleChange}
          error={!!errors.e_mail}
          helperText={errors.e_mail}
          disabled={isLoading}
          placeholder="Ej: usuario@empresa.com"
        />
        
        <TextField 
          label="Contraseña" 
          name="password" 
          type="password" 
          fullWidth 
          margin="dense" 
          value={form.password}
          onChange={handleChange}
          error={!!errors.password}
          helperText={errors.password || "Mínimo 6 caracteres"}
          disabled={isLoading}
          placeholder="••••••"
        />

        {/* Información sobre el rol por defecto */}
        <Alert severity="info" sx={{ mt: 2 }}>
          El nuevo usuario tendrá el rol de <strong>Operario</strong> por defecto. 
          Puedes cambiar el rol posteriormente desde la lista de usuarios.
        </Alert>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button 
          onClick={handleClose} 
          disabled={isLoading}
        >
          Cancelar
        </Button>
        
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : null}
        >
          {isLoading ? "Creando..." : "Crear Usuario"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserModal;