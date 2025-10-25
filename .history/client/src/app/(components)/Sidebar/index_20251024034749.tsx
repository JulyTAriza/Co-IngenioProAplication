"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsSidebarCollapsed } from "@/state";
import {
  Layout,
  LucideIcon,
  Menu,
  SlidersHorizontal,
  User,
  Boxes,
  LayoutDashboard,
  Package,
  CalendarClock,
  FileBarChart,
  CheckSquare,
  TrendingUp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState, useEffect } from "react";

interface SidebarLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isCollapsed: boolean;
  isOperario: boolean;
}

const SidebarLink = ({
  href,
  icon: Icon,
  label,
  isCollapsed,
  isOperario,
}: SidebarLinkProps) => {
  const pathname = usePathname();
  
  // Determinar si el link está activo considerando ambos dashboards
  const isActive = 
    pathname === href || 
    (pathname === "/" && href === "/dashboard") ||
    (pathname === "/dashboard/dashboard-operario" && href === "/dashboard/dashboard-operario") ||
    (pathname === "/dashboard" && href === "/dashboard");

  // Si es operario y trata de acceder a rutas no permitidas, prevenir comportamiento por defecto
  const handleClick = (e: React.MouseEvent) => {
    const allowedRoutes = ['/dashboard/dashboard-operario', '/my-task', '/settings'];
    if (isOperario && !allowedRoutes.includes(href)) {
      e.preventDefault();
      alert("No tienes permisos para acceder a esta sección");
      return;
    }
  };

  return (
    <Link href={href} onClick={handleClick}>
      <div
        className={`cursor-pointer flex items-center ${
          isCollapsed ? "justify-center py-3" : "justify-start px-6 py-3"
        }
        hover:text-blue-600 hover:bg-blue-50 gap-3 transition-all duration-200 ${
          isActive ? "bg-blue-100 text-blue-700 border-r-2 border-blue-600" : "text-gray-600"
        } ${
          isOperario && !['/dashboard/dashboard-operario', '/my-task', '/settings'].includes(href) 
            ? 'opacity-50 cursor-not-allowed' 
            : ''
        }`}
      >
        <Icon className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-gray-500"}`} />

        <span
          className={`${
            isCollapsed ? "hidden" : "block"
          } font-medium text-sm`}
        >
          {label}
        </span>
      </div>
    </Link>
  );
};

const Sidebar = () => {
  const dispatch = useAppDispatch();
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed
  );

  // Estado para el usuario
  const [usuario, setUsuario] = useState<{
    id: number;
    username: string;
    email: string;
    rol: string;
  } | null>(null);

  // Cargar usuario del localStorage
  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('usuario');
    if (usuarioGuardado) {
      try {
        const usuarioData = JSON.parse(usuarioGuardado);
        setUsuario(usuarioData);
        console.log("Usuario cargado en Sidebar:", usuarioData);
      } catch (error) {
        console.error("Error al parsear usuario:", error);
      }
    }
  }, []);

  const toggleSidebar = () => {
    dispatch(setIsSidebarCollapsed(!isSidebarCollapsed));
  };

  // Verificar si el usuario es operario
  const isOperario = usuario?.rol?.toLowerCase() === 'operario';
  console.log("Es operario:", isOperario, "Rol:", usuario?.rol);

  // Definir todos los links disponibles
  const allLinks = [
    {
      href: isOperario ? "/dashboard/dashboard-operario" : "/dashboard", // ← CAMBIO IMPORTANTE AQUÍ
      icon: Layout,
      label: "Dashboard",
      allowedForOperario: true
    },
    {
      href: "/projects",
      icon: LayoutDashboard,
      label: "Proyectos",
      allowedForOperario: false
    },
    {
      href: "/inventory",
      icon: Boxes,
      label: "Inventario",
      allowedForOperario: false
    },
    {
      href: "/materials",
      icon: Package,
      label: "Materiales",
      allowedForOperario: false
    },
    {
      href: "/schedule",
      icon: CalendarClock,
      label: "Cronograma",
      allowedForOperario: false
    },
    {
      href: "/my-task",
      icon: CheckSquare,
      label: "Mis Tareas",
      allowedForOperario: true
    },
    {
      href: "/progress",
      icon: TrendingUp,
      label: "Progreso",
      allowedForOperario: false
    },
    {
      href: "/reports",
      icon: FileBarChart,
      label: "Reportes",
      allowedForOperario: false
    },
    {
      href: "/users",
      icon: User,
      label: "Usuarios",
      allowedForOperario: false
    },
    {
      href: "/settings",
      icon: SlidersHorizontal,
      label: "Configuraciones",
      allowedForOperario: true
    }
  ];

  // Filtrar links según el rol
  const visibleLinks = isOperario 
    ? allLinks.filter(link => link.allowedForOperario)
    : allLinks;

  console.log("Links visibles para", usuario?.rol, ":", visibleLinks.map(l => l.label));

  const sidebarClassNames = `fixed flex flex-col ${
    isSidebarCollapsed ? "w-0 md:w-16" : "w-72 md:w-64"
  } bg-white transition-all duration-300 overflow-hidden h-full shadow-lg z-40`;

  return (
    <div className={sidebarClassNames}>
      {/* TOP LOGO */}
      <div
        className={`flex gap-3 justify-between md:justify-normal items-center pt-6 ${
          isSidebarCollapsed ? "px-4" : "px-6"
        }`}
      >
        <div className="flex flex-col items-center py-6">
          {!isSidebarCollapsed && (
            <h1 className="logo-title text-xl font-bold text-gray-800 mb-3">
              Co-IngenioPro
            </h1>
          )}
          <Image
            src="/assets/logo.png"
            alt="Logo Co-IngenioPro"
            width={isSidebarCollapsed ? 48 : 64}
            height={isSidebarCollapsed ? 48 : 64}
            className="rounded-full transition-all duration-300"
          />
          {!isSidebarCollapsed && usuario && (
            <div className="mt-2 text-xs text-gray-500">
              {usuario.username} ({usuario.rol})
            </div>
          )}
        </div>

        <button
          className="md:hidden p-2 bg-gray-100 rounded-lg hover:bg-blue-100 transition-colors"
          onClick={toggleSidebar}
        >
          <Menu className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* LINKS - Solo los permitidos según el rol */}
      <div className="flex-grow mt-2 space-y-1">
        {visibleLinks.map((link) => (
          <SidebarLink
            key={link.href}
            href={link.href}
            icon={link.icon}
            label={link.label}
            isCollapsed={isSidebarCollapsed}
            isOperario={isOperario}
          />
        ))}
      </div>

      {/* FOOTER */}
      <div className={`${isSidebarCollapsed ? "hidden" : "block"} py-6`}>
        <p className="text-center text-xs text-gray-500">&copy; 2025 Co-IngenioPro</p>
        {!isSidebarCollapsed && isOperario && (
          <p className="text-center text-xs text-gray-400 mt-1">
            Acceso Limitado - Operario
          </p>
        )}
      </div>
    </div>
  );
};

export default Sidebar;