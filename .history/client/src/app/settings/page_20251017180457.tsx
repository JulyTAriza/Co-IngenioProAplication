"use client";

import React, { useState, useEffect } from "react";
import { useGetUserConfigQuery, useUpdateUserConfigMutation } from "@/state/api";
import Header from "@/app/(components)/Header";
import { Loader2, Check } from "lucide-react";

const SettingsPage = () => {
  const userId = 1; // ← Reemplaza con autenticación real

  const { data, isLoading, refetch } = useGetUserConfigQuery(userId);
  const [updateUserConfig, { isLoading: isUpdating }] = useUpdateUserConfigMutation();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [language, setLanguage] = useState("Español");
  const [avatarStyle, setAvatarStyle] = useState("adventurer");
  const [avatarSeed, setAvatarSeed] = useState("person1");

  useEffect(() => {
    if (data) {
      setUsername(data.username || "");
      setEmail(data.email || "");
      setLanguage(data.language || "Español");
      setAvatarStyle(data.avatar_style?.split(":")[0] || "adventurer");
      setAvatarSeed(data.avatar_style?.split(":")[1] || "person1");
    }
  }, [data]);

  const handleSave = async () => {
    try {
      const payload = {
        userId,
        data: { 
          email, 
          language, 
          avatar_style: `${avatarStyle}:${avatarSeed}` 
        },
      };
      const res = await updateUserConfig(payload).unwrap();
      if (res.success) {
        alert("✅ Configuración actualizada correctamente");
        refetch();
      } else {
        alert(res.message || "Error al actualizar");
      }
    } catch {
      alert("❌ Error de conexión con el servidor");
    }
  };

  // 🎨 Estilos de avatar disponibles en DiceBear
  const avatarStyles = [
    { id: "adventurer", name: "Aventurero" },
    { id: "avataaars", name: "Avataaars" },
    { id: "big-smile", name: "Gran Sonrisa" },
    { id: "bottts", name: "Robots" },
    { id: "fun-emoji", name: "Emojis" },
    { id: "personas", name: "Personas" },
    { id: "pixel-art", name: "Pixel Art" },
    { id: "thumbs", name: "Pulgares" },
  ];

  // 👤 Seeds predeterminadas para variación
  const avatarSeeds = [
    "Felix", "Aneka", "Garfield", "Tigger", "Boots", "Luna", 
    "Simba", "Nala", "Oreo", "Mittens", "Shadow", "Cleo"
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-6">
      <Header name="Configuraciones" />

      <div className="bg-white dark:bg-gray-900 shadow-md rounded-2xl p-8 mt-6">
        
        {/* 👤 NOMBRE DE USUARIO (solo lectura) */}
        <div className="mb-6">
          <label className="block text-gray-700 dark:text-gray-200 font-semibold mb-2">
            Nombre de usuario
          </label>
          <div className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            {username || "Sin nombre"}
          </div>
        </div>

        {/* 📧 EMAIL */}
        <div className="mb-6">
          <label className="block text-gray-700 dark:text-gray-200 font-semibold mb-2">
            Correo electrónico
          </label>
          <input
            type="email"
            className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
          />
        </div>

        {/* 🌐 IDIOMA */}
        <div className="mb-6">
          <label className="block text-gray-700 dark:text-gray-200 font-semibold mb-2">
            Idioma
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="Español">Español</option>
            <option value="Inglés">Inglés</option>
            <option value="Portugués">Portugués</option>
          </select>
        </div>

        {/* 🎨 ESTILO DE AVATAR */}
        <div className="mb-6">
          <label className="block text-gray-700 dark:text-gray-200 font-semibold mb-2">
            Estilo de icono
          </label>
          <select
            value={avatarStyle}
            onChange={(e) => setAvatarStyle(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
          >
            {avatarStyles.map((style) => (
              <option key={style.id} value={style.id}>
                {style.name}
              </option>
            ))}
          </select>
        </div>

        {/* 👥 SELECCIÓN DE AVATAR */}
        <div className="mb-8">
          <label className="block text-gray-700 dark:text-gray-200 font-semibold mb-3">
            Icono de perfil
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
            {avatarSeeds.map((seed) => (
              <div
                key={seed}
                onClick={() => setAvatarSeed(seed)}
                className={`relative cursor-pointer rounded-full p-1 border-3 transition-all hover:scale-110 ${
                  avatarSeed === seed
                    ? "border-blue-500 shadow-lg ring-4 ring-blue-200"
                    : "border-gray-300 dark:border-gray-600 hover:border-blue-300"
                }`}
              >
                <img
                  src={`https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${seed}`}
                  alt={seed}
                  className="w-full h-full rounded-full"
                />
                {avatarSeed === seed && (
                  <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-1">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 💾 BOTÓN GUARDAR */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 px-8 py-3 rounded-lg flex items-center font-semibold transition-colors"
          >
            {isUpdating && <Loader2 className="animate-spin w-5 h-5 mr-2" />}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;