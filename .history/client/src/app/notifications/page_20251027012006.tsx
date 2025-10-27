"use client";

import { useState, useMemo } from "react";
import { Bell } from "lucide-react";
import {
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
} from "@/state/api";
import type { Notification } from "@/state/api";

const NotificationBell = ({ username }: { username: string }) => {
  const { data: notifications = [], isFetching, error } = useGetNotificationsQuery(username, {
    skip: !username,
  });

  console.log("Notifs API raw:", notifications, { isFetching, error });

  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [open, setOpen] = useState(false);

  // Obtener solo las últimas 5 notificaciones ordenadas por fecha
  const recentNotifications = useMemo(() => {
    const sorted = [...notifications].sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA; // Más recientes primero
    });
    return sorted.slice(0, 5); // Solo las primeras 5
  }, [notifications]);

  const unreadCount = notifications.filter(
    (n: Notification) => !n.is_read
  ).length;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative">
        <Bell className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-semibold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h3 className="font-semibold text-gray-800">Notificaciones</h3>
            <p className="text-xs text-gray-500 mt-1">
              {unreadCount > 0 ? `${unreadCount} sin leer` : "Todo al día"}
            </p>
          </div>

          {/* Lista de notificaciones */}
          <div className="overflow-y-auto max-h-80">
            {recentNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No hay notificaciones</p>
              </div>
            ) : (
              recentNotifications.map((n: Notification) => (
                <div
                  key={n.id}
                  className={`p-4 border-b hover:bg-gray-50 transition-colors ${
                    n.is_read ? "bg-white" : "bg-blue-50"
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-800">{n.title}</p>
                        {!n.is_read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{n.message}</p>
                      <p className="text-xs text-gray-400">
                        {n.created_at ? new Date(n.created_at).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : ""}
                      </p>
                    </div>
                    {!n.is_read && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium whitespace-nowrap"
                      >
                        Marcar leída
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer - solo si hay más de 5 notificaciones */}
          {notifications.length > 5 && (
            <div className="bg-gray-50 px-4 py-3 border-t">
              <p className="text-xs text-gray-500 text-center">
                Mostrando las 5 notificaciones más recientes de {notifications.length} totales
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
