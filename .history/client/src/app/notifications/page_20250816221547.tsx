import { useState } from "react";
import { Bell } from "lucide-react"; // Icono de campana de Lucide
import {
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
} from "@/state/api";
import type { Notification } from "@/state/api";

const NotificationBell = ({ username }: { username: string }) => {
  const { data: notifications = [] } = useGetNotificationsQuery(username);
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter(
    (n: Notification) => !n.is_read
  ).length;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative">
        <Bell className="w-6 h-6 text-gray-700" /> {/* Campana Lucide */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs px-1 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white border rounded-lg shadow-lg z-50">
          {notifications.length === 0 ? (
            <p className="p-2 text-gray-500">No hay notificaciones</p>
          ) : (
            notifications.map((n: Notification) => (
              <div
                key={n.id}
                className={`flex justify-between items-center p-2 border-b ${
                  n.is_read ? "bg-gray-100" : "bg-white"
                }`}
              >
                <div>
                  <p className="font-semibold">{n.title}</p>
                  <p className="text-sm text-gray-600">{n.message}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="text-blue-500 hover:text-blue-700 text-xs"
                  >
                    Marcar leído
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
