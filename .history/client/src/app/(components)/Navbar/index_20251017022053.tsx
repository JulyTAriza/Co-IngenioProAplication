"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsDarkMode, setIsSidebarCollapsed } from "@/state";
import { Bell, Menu, Moon, Settings, Sun, LogOut } from "lucide-react";
import Link from "next/link";
import React, { useState, useEffect } from "react"; 
import NotificationBell from "@/app/notifications/page";
import { useRouter } from "next/navigation";

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

  // ← ESTADO PARA GUARDAR LA INFO DEL USUARIO
  const [usuario, setUsuario] = useState<{
    id: number;
    username: string;
    email: string;
    rol: string;
  } | null>(null);

  // ← CARGAR USUARIO DEL LOCALSTORAGE
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

  // ← FUNCIÓN PARA CERRAR SESIÓN
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    router.push('/login');
  };

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
          
          {/* ← PERFIL DEL USUARIO CON ROL */}
          <div className="flex items-center gap-3">
            {/* Avatar con inicial */}
            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {usuario?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            
            {/* Info del usuario */}
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-gray-800">
                {usuario?.username || 'Admin'}
              </span>
              <span className="text-xs text-gray-500">
                {usuario?.rol || 'Cargando...'}
              </span>
            </div>

            {/* Botón de cerrar sesión */}
            <button
              onClick={handleLogout}
   className="ml-2 p-2 hover:bg-red-50 rounded-full transition-colors"
    title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4 text-red-600" />
            </button>
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