"use client";

import React, { useState, useEffect } from "react";
import { useGetUserConfigQuery, useUpdateUserConfigMutation } from "@/state/api";
import Header from "@/app/(components)/Header";
import Avatar from "react-avatar";
import { Loader2 } from "lucide-react";

const SettingsPage = () => {
  // ⚙️ Configura el id del usuario autenticado
  const userId = 1; // ← Reemplaza por autenticación real

  // ✅ Hooks de RTK Query
  const { data, isLoading, refetch } = useGetUserConfigQuery(userId);
  const [updateUserConfig, { isLoading: isUpdating }] = useUpdateUserConfigMutation();

  // ✅ Estado local
  const [email, setEmail] = useState("");
  const [language, setLanguage] = useState("Español");
  const [avatarStyle, setAvatarStyle] = useState("person1");

  // 🧠 Sincroniza datos iniciales cuando llegan
  useEffect(() => {
    if (data) {
      setEmail(data.email || "");
      setLanguage(data.language || "Español");
      setAvatarStyle(data.avatar_style || "person1");
    }
  }, [data]);

  // 📤 Maneja la actualización
  const handleSave = async () => {
    try {
      const payload = {
        userId,
        data: { email, language, avatar_style: avatarStyle },
      };
      const res = await updateUserConfig(payload).unwrap();
      if (res.success) {
        alert("Configuración actualizada correctamente");
        refetch();
      } else {
        alert(res.message || "Error al actualizar");
      }
    } catch {
      alert("Error de conexión con el servidor");
    }
  };

  // 👤 Opciones de avatar
  const avatarOptions = [
    "person1",
    "person2",
    "person3",
    "person4",
    "person5",
    "person6",
    "person7",
    "person8",
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <Header name="Configuraciones" />

      <div className="bg-white dark:bg-gray-900 shadow-md rounded-2xl p-6 mt-6">
        {/* EMAIL */}
        <div className="mb-5">
          <label className="block text-gray-600 dark:text-gray-200 font-semibold mb-1">
            Correo electrónico
          </label>
          <input
            type="email"
            className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* IDIOMA */}
        <div className="mb-5">
          <label className="block text-gray-600 dark:text-gray-200 font-semibold mb-1">
            Idioma
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="Español">Español</option>
            <option value="Inglés">Inglés</option>
            <option value="Portugués">Portugués</option>
          </select>
        </div>

        {/* AVATAR */}
        <div className="mb-5">
          <label className="block text-gray-600 dark:text-gray-200 font-semibold mb-2">
            Icono de perfil
          </label>
          <div className="grid grid-cols-4 gap-3">
            {avatarOptions.map((option) => (
              <div
                key={option}
                onClick={() => setAvatarStyle(option)}
                className={`cursor-pointer rounded-full p-1 border-2 transition ${
                  avatarStyle === option
                    ? "border-blue-500"
                    : "border-transparent hover:border-gray-300"
                }`}
              >
                <Avatar
                  name={option}
                  size="80"
                  round={true}
                  color={avatarStyle === option ? "#3b82f6" : undefined}
                />
              </div>
            ))}
          </div>
        </div>

        {/* GUARDAR */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="bg-blue-600 text-white hover:bg-blue-700 px-5 py-2 rounded-lg flex items-center"
          >
            {isUpdating && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;


