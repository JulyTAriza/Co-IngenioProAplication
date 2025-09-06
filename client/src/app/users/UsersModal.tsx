"use client";

import { useState } from "react";
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from "@mui/material";
import { useCreateUserMutation } from "@/state/api";

const UserModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [form, setForm] = useState({ username: "", password: "", e_mail: "" });
  const [createUser] = useCreateUserMutation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    await createUser(form);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Crear Usuario</DialogTitle>
      <DialogContent>
        <TextField label="Nombre" name="username" fullWidth margin="dense" onChange={handleChange} />
        <TextField label="Correo" name="e_mail" fullWidth margin="dense" onChange={handleChange} />
        <TextField label="Contraseña" name="password" type="password" fullWidth margin="dense" onChange={handleChange} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained">Crear</Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserModal;
