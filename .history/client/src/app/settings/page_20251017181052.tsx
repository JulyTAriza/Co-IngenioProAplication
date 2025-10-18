"use client";

import React, { useState, useEffect } from "react";
import { useGetUserConfigQuery, useUpdateUserConfigMutation } from "@/state/api";
import { Loader2, Check, Mail, Globe } from "lucide-react";

const SettingsPage = () => {
  const userId = 1; // ← Reemplaza con autenticación real

  const { data, isLoading, refetch } = useGetUserConfigQuery(userId);
  const [updateUserConfig, { isLoading: isUpdating }] = useUpdateUserConfigMutation();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [language, setLanguage] = useState("Español");
  const [avatarStyle, setAvatarStyle] = useState("adventurer");
  const [avatarSeed, setAvatarSeed] = useState("Felix");

  useEffect(() => {
    if (data) {
      setUsername(data.username || "");
      setEmail(data.email || "");
      setLanguage(data.language || "Español");
      const [style, seed] = data.avatar_style?.split(":") || ["adventurer", "Felix"];
      setAvatarStyle(style);
      setAvatarSeed(seed);
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

  const avatarSeeds = [
    "Felix", "Aneka", "Garfield", "Tigger", "Boots", "Luna", 
    "Simba", "Nala", "Oreo", "Mittens", "Shadow", "Cleo"
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin w-10 h-10 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        
        {/* 🎨 TARJETA PRINCIPAL DE PERFIL */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden">
          
          {/* Header con gradiente */}
          <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-32"></div>
          
          {/* Contenido del perfil */}
          <div className="px-8 pb-8">
            
            {/* Avatar y nombre */}
            <div className="flex items-start -mt-16 mb-8">
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden bg-white shadow-lg">
                  <img
                    src={`https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${avatarSeed}`}
                    alt="Avatar"
                    className="w-full h-full"
                  />
                </div>
              </div>
              
              <div className="ml-6 mt-16">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {username || "Usuario"}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  @{username?.toLowerCase() || "usuario"}
                </p>
              </div>
            </div>

            {/* Grid de información y configuración */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* 📧 SECCIÓN: INFORMACIÓN DE CONTACTO */}
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Información de contacto
                </h2>
                
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                  <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Mail className="w-4 h-4 mr-2" />
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                  />
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                  <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Globe className="w-4 h-4 mr-2" />
                    Idioma preferido
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Español">🇪🇸 Español</option>
                    <option value="Inglés">🇺🇸 Inglés</option>
                    <option value="Portugués">🇧🇷 Portugués</option>
                  </select>
                </div>
              </div>

              {/* 👤 SECCIÓN: PERSONALIZACIÓN DE AVATAR */}
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Personalización
                </h2>
                
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
                    Estilo de avatar
                  </label>
                  <select
                    value={avatarStyle}
                    onChange={(e) => setAvatarStyle(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {avatarStyles.map((style) => (
                      <option key={style.id} value={style.id}>
                        {style.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
                    Selecciona tu avatar
                  </label>
                  <div className="grid grid-cols-6 gap-3">
                    {avatarSeeds.map((seed) => (
                      <div
                        key={seed}
                        onClick={() => setAvatarSeed(seed)}
                        className={`relative cursor-pointer rounded-full transition-all hover:scale-110 ${
                          avatarSeed === seed
                            ? "ring-4 ring-blue-500 scale-105"
                            : "hover:ring-2 hover:ring-gray-300"
                        }`}
                      >
                        <img
                          src={`https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${seed}`}
                          alt={seed}
                          className="w-full h-full rounded-full"
                        />
                        {avatarSeed === seed && (
                          <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-1 shadow-lg">
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 💾 BOTÓN GUARDAR */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleSave}
                disabled={isUpdating}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 px-8 py-3 rounded-xl flex items-center font-semibold shadow-lg transition-all hover:shadow-xl hover:scale-105 disabled:scale-100"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="animate-spin w-5 h-5 mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Guardar cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;