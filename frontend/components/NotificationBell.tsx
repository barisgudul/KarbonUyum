// frontend/components/NotificationBell.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, Trash2, ExternalLink } from 'lucide-react';

interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  notification_type: string;
  action_url?: string;
  created_at: string;
}

export default function NotificationBell() {
  const [showPanel, setShowPanel] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Bildirimler yükle
  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications?limit=10`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      }
    } catch (error) {
      console.error('Bildirimler yüklenemedi:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Her 30 saniyede bir güncelle
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Bildirimi oku olarak işaretle
  const markAsRead = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications/${id}/mark-read`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      loadNotifications();
    } catch (error) {
      console.error('Hata:', error);
    }
  };

  // Bildirimi sil
  const deleteNotification = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications/${id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      loadNotifications();
    } catch (error) {
      console.error('Hata:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'anomaly':
        return '⚠️';
      case 'suggestion':
        return '💡';
      case 'update':
        return '📢';
      default:
        return '🔔';
    }
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 text-emerald-300 hover:text-emerald-200 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold 
                       rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-96 max-h-96 bg-slate-800 border-2 border-emerald-500/40 
                       rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 p-4 border-b border-emerald-500/30 
                            flex items-center justify-between">
              <h3 className="font-bold text-emerald-300">Bildirimler</h3>
              <button
                onClick={() => setShowPanel(false)}
                className="p-1 hover:bg-emerald-500/20 rounded transition-colors"
              >
                <X className="w-5 h-5 text-emerald-300" />
              </button>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center text-emerald-300/50">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500/20 
                                  border-t-emerald-500 mx-auto"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-emerald-300/50">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Bildirim yok</p>
                </div>
              ) : (
                <div className="divide-y divide-emerald-500/20">
                  {notifications.map((notif) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 hover:bg-emerald-500/5 transition-colors ${
                        notif.is_read ? 'opacity-60' : 'bg-emerald-500/5'
                      }`}
                    >
                      <div className="flex gap-3">
                        <span className="text-xl flex-shrink-0">
                          {getNotificationIcon(notif.notification_type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-bold ${notif.is_read ? 'text-emerald-300/60' : 'text-emerald-300'}`}>
                            {notif.title}
                          </h4>
                          <p className={`text-xs mt-1 ${notif.is_read ? 'text-emerald-400/40' : 'text-emerald-400/70'}`}>
                            {notif.message}
                          </p>
                          {notif.action_url && (
                            <a
                              href={notif.action_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-cyan-400 hover:text-cyan-300 mt-2 inline-flex items-center gap-1"
                            >
                              Detaylara Git
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {!notif.is_read && (
                            <button
                              onClick={() => markAsRead(notif.id)}
                              className="p-1 hover:bg-emerald-500/20 rounded transition-colors"
                              title="Okundu olarak işaretle"
                            >
                              <Check className="w-4 h-4 text-emerald-400" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notif.id)}
                            className="p-1 hover:bg-red-500/20 rounded transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="bg-slate-800/50 border-t border-emerald-500/20 p-3 text-center text-xs text-emerald-400/70">
                {unreadCount} yeni bildirim
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
