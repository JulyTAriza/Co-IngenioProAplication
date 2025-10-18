"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsDarkMode, setIsSidebarCollapsed } from "@/state";
import { Bell, Menu, Moon, Settings, Sun, LogOut, ChevronDown } from "lucide-react";
import Link from "next/link";
import React, { useState, useEffect, useRef } from "react"; 
import NotificationBell from "@/app/notifications/page";
import { useRouter } from "next/navigation";
import { useGetUserConfigQuery } from "@/state/api";

const Navbar = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed
  );
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  const toggleSidebar = () => {
    dispatch(setIsSidebarCollapsed(!isSidebarCollapsed));
  };

  const toggleDarkMode = () => {
    dispatch(setIsDarkMode(!isDarkMode));
  };

  // Estado para el usuario
  const [usuario, setUsuario] = useState<{
    id: number;
    username: string;
    email: string;
    rol: string;
  } | null>(null);

  // 🎨 Obtener configuración del usuario (avatar)
  const { data: userConfig } = useGetUserConfigQuery(usuario?.id || 0, {
    skip: !usuario?.id
  });

  // Estado para el dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cargar usuario del localStorage
  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('usuario');
    if (usuarioGuardado) {
      try {
        setUsuario(JSON.parse(usuarioGuardado));
      } catch (error) {
        console.error("Error al parsear usuario:", error);
      }
    }
  }, []);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Función para cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    router.push('/login');
  };

  // 🎨 Obtener URL del avatar
  const getAvatarUrl = () => {
    if (!userConfig?.avatar_style) return null;
    const [style, seed] = userConfig.avatar_style.split(":");
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
  };

  const avatarUrl = getAvatarUrl();

  return (
    <div className="flex justify-between items-center w-full mb-7">
      {/* LEFT SIDE */}
      <div className="flex justify-between items-center gap-5">
        <button
          className="px-3 py-3 bg-gray-100 rounded-full hover:bg-blue-100"
          onClick={toggleSidebar}
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="relative">
          <input
            type="search"
            placeholder="Start type to search groups & products"
            className="pl-10 pr-4 py-2 w-50 md:w-60 border-2 border-gray-300 bg-white rounded-lg focus:outline-none focus:border-blue-500"
          />

          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Bell className="text-gray-500" size={20} />
          </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex justify-between items-center gap-5">
        <div className="hidden md:flex justify-between items-center gap-5">
          <div>
            <button onClick={toggleDarkMode}>
              {isDarkMode ? (
                <Sun className="cursor-pointer text-gray-500" size={24} />
              ) : (
                <Moon className="cursor-pointer text-gray-500" size={24} />
              )}
            </button>
          </div>
          {usuario?.username && <NotificationBell username={usuario.username} />}

          <hr className="w-0 h-7 border border-solid border-l border-gray-300 mx-3" />
          
          {/* PERFIL DEL USUARIO CON DROPDOWN */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-lg transition-colors"
            >
              {/* Avatar personalizado o fallback */}
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={usuario?.username || "Avatar"}
                  className="w-14 h-14 rounded-full shadow-md border-2 border-blue-500"
                />
              ) : (
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-md">
                  {usuario?.username?.charAt(0).toUpperCase() || 'A'}
                </div>
              )}
              
              {/* Info del usuario */}
              <div className="flex flex-col text-left">
                <span className="font-semibold text-base text-gray-800">
                  {usuario?.username || 'Admin'}
                </span>
                <span className="text-xs text-gray-500">
                  {usuario?.rol || 'Cargando...'}
                </span>
              </div>

              {/* Flecha */}
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* DROPDOWN MENU */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                {/* Información del usuario */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3 mb-2">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={usuario?.username || "Avatar"}
                        className="w-12 h-12 rounded-full border-2 border-blue-400"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {usuario?.username?.charAt(0).toUpperCase() || 'A'}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{usuario?.username}</p>
                      <p className="text-xs text-blue-600 font-medium">{usuario?.rol}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">{usuario?.email}</p>
                </div>

                {/* Opciones */}
                <Link href="/settings">
                  <button
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Configuración
                  </button>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
        
        <Link href="/settings">
          <Settings className="cursor-pointer text-gray-500" size={24} />
        </Link>
      </div>
    </div>
  );
};

export default Navbar;