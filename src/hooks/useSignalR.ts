import { useEffect, useRef, useCallback } from 'react';
import { HubConnectionBuilder, HubConnection, LogLevel, HubConnectionState } from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from './useAuth';

// Use dedicated SIGNALR_URL env var; fall back to deriving from API_URL
const SIGNALR_BASE = import.meta.env.VITE_SIGNALR_URL
  || (import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '') + '/hubs';

function getHubUrl(hubPath: string): string {
  const base = SIGNALR_BASE.endsWith('/') ? SIGNALR_BASE.slice(0, -1) : SIGNALR_BASE;
  // For relative paths, prefix with current origin so SignalR gets a full URL
  if (base.startsWith('/')) {
    return `${window.location.origin}${base}/${hubPath}`;
  }
  return `${base}/${hubPath}`;
}

/**
 * Start a hub connection safely — handles React StrictMode double-mount
 * by using a `cancelled` flag instead of calling stop() during negotiation.
 */
function startConnection(
  conn: HubConnection,
  cancelled: { value: boolean },
  hubName: string,
) {
  conn
    .start()
    .then(() => {
      // If the cleanup ran while we were still negotiating, stop now
      if (cancelled.value) {
        conn.stop();
      }
    })
    .catch((err) => {
      if (!cancelled.value) {
        console.warn(`${hubName} connection failed:`, err);
      }
    });
}

/** Stop a hub connection only when it is safe (already connected / reconnecting). */
function safeStop(conn: HubConnection, cancelled: { value: boolean }) {
  cancelled.value = true;
  // Only call stop when the connection is fully established.
  // If it is still connecting, the .then() handler above will stop it.
  if (
    conn.state === HubConnectionState.Connected ||
    conn.state === HubConnectionState.Reconnecting
  ) {
    conn.stop();
  }
}

export function useSignalR() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const notificationConn = useRef<HubConnection | null>(null);
  const orderConn = useRef<HubConnection | null>(null);

  const refreshQuotationQueries = useCallback(() => {
    const quotationKeys = [
      ['customer-quotations'],
      ['rep-quotations'],
      ['coordinator-quotations'],
      ['admin-quotations'],
    ] as const;

    for (const key of quotationKeys) {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.refetchQueries({ queryKey: key, type: 'active' });
    }
  }, [queryClient]);

  const refreshOrderQueries = useCallback(() => {
    const orderKeys = [
      ['admin-orders'],
      ['rep-orders'],
      ['customer-orders'],
      ['coordinator-orders'],
      ['admin-order'],
      ['rep-order'],
      ['customer-order'],
      ['coordinator-order'],
    ] as const;

    for (const key of orderKeys) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  }, [queryClient]);

  const refreshSupportQueries = useCallback(() => {
    const supportKeys = [
      ['admin-complaints'],
      ['customer-complaints'],
      ['rep-complaints'],
      ['coordinator-complaints'],
    ] as const;

    for (const key of supportKeys) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  }, [queryClient]);

  const createConnection = useCallback((hubPath: string): HubConnection => {
    const token = localStorage.getItem('accessToken') || '';
    return new HubConnectionBuilder()
      .withUrl(getHubUrl(hubPath), { accessTokenFactory: () => token })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();
  }, []);

  // Connect to NotificationHub (all roles)
  useEffect(() => {
    if (!isAuthenticated) return;

    const cancelled = { value: false };
    const conn = createConnection('notifications');
    notificationConn.current = conn;

    conn.on('ReceiveNotification', (notification: { title: string; message: string }) => {
      toast(notification.message, { icon: '🔔', duration: 5000 });
      // invalidation keys include userId so that cache updates for the current user
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['unread-count', user?.id] });
      refreshQuotationQueries();
      refreshSupportQueries();
    });

    conn.on('NewOrder', (data: { id: string; orderNumber: string; actorName?: string; customerName?: string }) => {
      let txt = `New order #${data.orderNumber}`;
      if (data.customerName) txt += ` for ${data.customerName}`;
      if (data.actorName) txt += ` by ${data.actorName}`;
      toast.success(txt, { duration: 4000 });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['unread-count', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    });

    conn.on('OrderStatusChanged', (data: { orderId: string; status: string }) => {
      toast(`Order status updated to ${data.status}`, { icon: '📦', duration: 4000 });
      refreshOrderQueries();
    });

    conn.on('PriceUpdated', (data: { name: string; sellingPrice: number }) => {
      toast(`Price updated: ${data.name}`, { icon: '💰', duration: 4000 });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['rep-catalog'] });
    });

    startConnection(conn, cancelled, 'NotificationHub');

    return () => safeStop(conn, cancelled);
  }, [isAuthenticated, createConnection, queryClient, refreshOrderQueries, refreshQuotationQueries, refreshSupportQueries, user?.id]);

  // Connect to OrderTrackingHub (all roles)
  useEffect(() => {
    if (!isAuthenticated) return;

    const cancelled = { value: false };
    const conn = createConnection('order-tracking');
    orderConn.current = conn;

    conn.on('OrderStatusChanged', (data: { orderId: string; status: string; reason?: string }) => {
      refreshOrderQueries();
    });

    startConnection(conn, cancelled, 'OrderTrackingHub');

    return () => safeStop(conn, cancelled);
  }, [isAuthenticated, createConnection, refreshOrderQueries]);


  // Join/leave order tracking group
  const joinOrderGroup = useCallback(async (orderId: string) => {
    if (orderConn.current?.state === HubConnectionState.Connected) {
      await orderConn.current.invoke('JoinOrderGroup', orderId);
    }
  }, []);

  const leaveOrderGroup = useCallback(async (orderId: string) => {
    if (orderConn.current?.state === HubConnectionState.Connected) {
      await orderConn.current.invoke('LeaveOrderGroup', orderId);
    }
  }, []);

  return { joinOrderGroup, leaveOrderGroup };
}
