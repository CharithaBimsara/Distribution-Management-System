import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../../services/api/notificationsApi';
import { formatDate } from '../../utils/formatters';
import { Bell, CheckCheck, Circle, Loader2 } from 'lucide-react';
import type { Notification } from '../../types/notification.types';
import toast from 'react-hot-toast';

export default function RepNotifications() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['rep-notifications', page],
    queryFn: () => notificationsApi.getAll({ page, pageSize: 30 }).then(r => r.data.data),
  });

  const { data: unread } = useQuery({
    queryKey: ['rep-unread-count'],
    queryFn: () => notificationsApi.getUnreadCount().then(r => r.data.data),
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rep-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['rep-unread-count'] });
    },
  });

  const markAllMut = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rep-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['rep-unread-count'] });
    },
  });

  const notifications = data?.items || [];

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-500 text-white px-5 pt-5 pb-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Notifications</h1>
            <p className="text-emerald-200 text-sm mt-0.5">{unread ? `${unread} unread` : 'All caught up'}</p>
          </div>
          {(unread ?? 0) > 0 && (
            <button
              onClick={() => markAllMut.mutate()}
              disabled={markAllMut.isPending}
              className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-xl text-xs font-semibold text-white hover:bg-white/30 transition flex items-center gap-1.5"
            >
              {markAllMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="px-4 -mt-5 relative z-10 pb-6">
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl skeleton" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-slate-100 rounded-full w-3/4 skeleton" />
                  <div className="h-3 bg-slate-100 rounded-full w-1/2 skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : !notifications.length ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-100">
            <Bell className="w-14 h-14 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No notifications</p>
            <p className="text-xs text-slate-400 mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 border border-slate-100 divide-y divide-slate-50 overflow-hidden">
            {notifications.map((n: Notification) => (
              <div
                key={n.id}
                onClick={() => !n.isRead && markReadMut.mutate(n.id)}
                className={`flex items-start gap-3 px-5 py-4 transition cursor-pointer ${
                  n.isRead ? 'bg-white' : 'bg-emerald-50/30 hover:bg-emerald-50/50'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  n.isRead ? 'bg-slate-50' : 'bg-gradient-to-br from-emerald-100 to-teal-100'
                }`}>
                  <Bell className={`w-5 h-5 ${n.isRead ? 'text-slate-300' : 'text-emerald-500'}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-snug ${n.isRead ? 'text-slate-600' : 'font-semibold text-slate-900'}`}>
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500 flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-slate-300 mt-1 font-medium">{formatTime(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <span className="text-xs text-slate-400 font-medium">Page {page} of {data.totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl disabled:opacity-40 shadow-sm">Previous</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages} className="px-4 py-2 text-xs font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl disabled:opacity-40 shadow-sm">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
