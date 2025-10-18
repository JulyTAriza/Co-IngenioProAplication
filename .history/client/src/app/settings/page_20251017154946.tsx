"use client";

import React, { useState, useEffect } from "react";
import Header from "@/app/(components)/Header";

const translations = {
  es: {
    userSettings: "Configuración de Usuario",
    username: "Nombre de Usuario",
    email: "Correo Electrónico",
    language: "Idioma",
    avatar: "Foto de Perfil",
    save: "Guardar Cambios",
    saved: "¡Cambios guardados exitosamente!",
    error: "Error al guardar los cambios",
    loading: "Cargando...",
    spanish: "Español",
    english: "English",
    portuguese: "Português",
    invalidEmail: "Email inválido",
  },
  en: {
    userSettings: "User Settings",
    username: "Username",
    email: "Email Address",
    language: "Language",
    avatar: "Profile Picture",
    save: "Save Changes",
    saved: "Changes saved successfully!",
    error: "Error saving changes",
    loading: "Loading...",
    spanish: "Español",
    english: "English",
    portuguese: "Português",
    invalidEmail: "Invalid email",
  },
  pt: {
    userSettings: "Configurações do Usuário",
    username: "Nome de Usuário",
    email: "Endereço de Email",
    language: "Idioma",
    avatar: "Foto de Perfil",
    save: "Salvar Alterações",
    saved: "Alterações salvas com sucesso!",
    error: "Erro ao salvar alterações",
    loading: "Carregando...",
    spanish: "Español",
    english: "English",
    portuguese: "Português",
    invalidEmail: "Email inválido",
  },
};

type Language = "es" | "en" | "pt";

interface UserSettings {
  id: number;
  user_id: number;
  username: string;
  email: string;
  language: Language;
  avatar: string;
}

interface Avatar {
  id: string;
  name: string;
}

const Settings = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [language, setLanguage] = useState<Language>("es");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [avatarList, setAvatarList] = useState<Avatar[]>([]);
  const [token, setToken] = useState<string | null>(null);

  const t = translations[language];

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const userId = localStorage.getItem("user_id");
    
    if (storedToken && userId) {
      setToken(storedToken);
      fetchSettings(parseInt(userId), storedToken);
      fetchAvatars(storedToken);
    } else {
      setLoading(false);
      setMessage("No autenticado");
    }
  }, []);

  const fetchSettings = async (userId: number, authToken: string) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/settings/${userId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSettings(data.data);
        setLanguage(data.data.language);
      } else {
        setMessage(t.error);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      setMessage(t.error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvatars = async (authToken: string) => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/settings/avatars/list",
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAvatarList(data.data);
      }
    } catch (error) {
      console.error("Error fetching avatars:", error);
    }
  };

  const handleSave = async () => {
    if (!settings || !token) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(settings.email)) {
      setMessage(t.invalidEmail);
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/settings/${settings.user_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            username: settings.username,
            email: settings.email,
            language: settings.language,
            avatar: settings.avatar,
          }),
        }
      );

      if (response.ok) {
        setMessage(t.saved);
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(t.error);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage(t.error);
    }
  };

  const handleChange = (field: keyof UserSettings, value: string) => {
    if (settings) {
      setSettings({ ...settings, [field]: value });
    }
    if (field === "language") {
      setLanguage(value as Language);
    }
  };

  if (loading) {
    return (
      <div className="w-full">
        <Header name={t.userSettings} />
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="w-full">
        <Header name={t.userSettings} />
        <div className="flex justify-center items-center h-64">
          <p className="text-red-500">{t.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Header name={t.userSettings} />
      <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
        {message && (
          <div
            className={`mb-4 p-3 rounded-md ${
              message.includes("exitosamente") ||
              message.includes("successfully") ||
              message.includes("sucesso")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        {/* Username */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t.username}
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={settings.username}
            onChange={(e) => handleChange("username", e.target.value)}
          />
        </div>

        {/* Email */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t.email}
          </label>
          <input
            type="email"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={settings.email}
            onChange={(e) => handleChange("email", e.target.value)}
          />
        </div>

        {/* Language */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t.language}
          </label>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={settings.language}
            onChange={(e) => handleChange("language", e.target.value)}
          >
            <option value="es">{t.spanish}</option>
            <option value="en">{t.english}</option>
            <option value="pt">{t.portuguese}</option>
          </select>
        </div>

        {/* Avatar Selector */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-4">
            {t.avatar}
          </label>
          <div className="grid grid-cols-4 gap-4">
            {avatarList.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => handleChange("avatar", avatar.id)}
                className={`p-4 rounded-lg border-2 transition ${
                  settings.avatar === avatar.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-blue-300"
                }`}
              >
                <div className="w-12 h-12 mx-auto bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {avatar.id.charAt(avatar.id.length - 1)}
                </div>
                <p className="text-xs text-center mt-2 text-gray-600">
                  {avatar.name}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200"
        >
          {t.save}
        </button>
      </div>
    </div>
  );
};

export default Settings;