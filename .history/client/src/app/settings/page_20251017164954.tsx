"use client";

import React, { useState } from "react";
import Header from "@/app/(components)/Header";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const dicebearStyles = [
  "adventurer",
  "bottts",
  "pixel-art",
  "avataaars",
  "identicon",
  "thumbs",
];

const Settings = () => {
  const [language, setLanguage] = useState("Español");
  const [email, setEmail] = useState("john.doe@example.com");
  const [selectedStyle, setSelectedStyle] = useState(dicebearStyles[0]);
  const [avatarSeed, setAvatarSeed] = useState("usuario_demo");

  const handleSave = () => {
    const settingsData = { language, email, avatarStyle: selectedStyle, avatarSeed };
    console.log("Saving user settings:", settingsData);
    // 🔗 Aquí podrías hacer fetch a tu API o guardar en localStorage
  };

  const getAvatarUrl = (style: string) =>
    `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(avatarSeed)}`;

  return (
    <div className="w-full">
      <Header name="Configuraciones del Usuario" />
      <div className="max-w-3xl mx-auto mt-8 bg-white rounded-2xl shadow-md p-6">
        {/* Idioma */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">
            Idioma del Aplicativo
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          >
            <option>Español</option>
            <option>Inglés</option>
            <option>Portugués</option>
          </select>
        </div>

        {/* Email */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">
            Correo Electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg p-2 text-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />
        </div>

        {/* Nombre base para el avatar */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">
            Nombre base del Avatar
          </label>
          <input
            type="text"
            value={avatarSeed}
            onChange={(e) => setAvatarSeed(e.target.value)}
            className="w-full border rounded-lg p-2 text-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />
        </div>

        {/* Estilo de avatar */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-4">
            Estilo del Ícono de Perfil
          </label>
          <div className="flex gap-4 flex-wrap">
            {dicebearStyles.map((style) => (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                key={style}
                className={`relative cursor-pointer rounded-full border-4 ${
                  selectedStyle === style
                    ? "border-blue-500"
                    : "border-transparent"
                }`}
                onClick={() => setSelectedStyle(style)}
              >
                <img
                  src={getAvatarUrl(style)}
                  alt={style}
                  className="w-16 h-16 rounded-full object-cover"
                />
                {selectedStyle === style && (
                  <div className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-1">
                    <Check size={16} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Guardar */}
        <div className="text-right">
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
