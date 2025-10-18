"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsSidebarCollapsed } from "@/state";
import { Pacifico } from 'next/font/google';

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
import React from "react";

interface SidebarLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isCollapsed: boolean;
}

const SidebarLink = ({
  href,
  icon: Icon,
  label,
  isCollapsed,
}: SidebarLinkProps) => {
  const pathname = usePathname();
  const isActive =
    pathname === href || (pathname === "/" && href === "/dashboard");

  return (
    <Link href={href}>
      <div
        className={`cursor-pointer flex items-center ${
          isCollapsed ? "justify-center py-3" : "justify-start px-6 py-3"
        }
        hover:text-blue-600 hover:bg-blue-50 gap-3 transition-all duration-200 ${
          isActive ? "bg-blue-100 text-blue-700 border-r-2 border-blue-600" : "text-gray-600"
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

  const toggleSidebar = () => {
    dispatch(setIsSidebarCollapsed(!isSidebarCollapsed));
  };

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
        </div>

        <button
          className="md:hidden p-2 bg-gray-100 rounded-lg hover:bg-blue-100 transition-colors"
          onClick={toggleSidebar}
        >
          <Menu className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* LINKS */}
      <div className="flex-grow mt-2 space-y-1">
        <SidebarLink
          href="/dashboard"
          icon={Layout}
          label="Dashboard"
          isCollapsed={isSidebarCollapsed}
        />
        <SidebarLink
          href="/projects"
          icon={LayoutDashboard}
          label="Proyectos"
          isCollapsed={isSidebarCollapsed}
        />
        <SidebarLink
          href="/inventory"
          icon={Boxes}
          label="Inventario"
          isCollapsed={isSidebarCollapsed}
        />
        <SidebarLink
          href="/materials"
          icon={Package}
          label="Materiales"
          isCollapsed={isSidebarCollapsed}
        />
        <SidebarLink
          href="/schedule"
          icon={CalendarClock}
          label="Cronograma"
          isCollapsed={isSidebarCollapsed}
        />
        <SidebarLink
          href="/my-task"
          icon={CheckSquare}
          label="Mis Tareas"
          isCollapsed={isSidebarCollapsed}
        />
        <SidebarLink
          href="/progress"
          icon={TrendingUp}
          label="Progreso"
          isCollapsed={isSidebarCollapsed}
        />
        <SidebarLink
          href="/reports"
          icon={FileBarChart}
          label="Reportes"
          isCollapsed={isSidebarCollapsed}
        />
        <SidebarLink
          href="/users"
          icon={User}
          label="Usuarios"
          isCollapsed={isSidebarCollapsed}
        />
        <SidebarLink
          href="/settings"
          icon={SlidersHorizontal}
          label="Configuraciones"
          isCollapsed={isSidebarCollapsed}
        />
      </div>

      {/* FOOTER */}
      <div className={`${isSidebarCollapsed ? "hidden" : "block"} py-6`}>
        <p className="text-center text-xs text-gray-500">&copy; 2025 Co-IngenioPro</p>
      </div>
    </div>
  );
};

export default Sidebar;