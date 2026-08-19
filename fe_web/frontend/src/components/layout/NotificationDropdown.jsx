import { useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { useNotificationStore } from '../../stores/notificationStore';
import { formatDistanceToNow } from 'date-fns';

export function NotificationDropdown({ onClose }) {
  const { notifications, fetchUnread, markAsRead, markAllAsRead, unreadCount } = useNotificationStore();

  useEffect(() => {
    fetchUnread();
  }, []);

  const formatTime = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <>
      <div className="fixed inset-0" onClick={onClose} />
      <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Notifications list */}
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0 ${
                  !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  {!notification.read && (
                    <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                      {notification.content}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
