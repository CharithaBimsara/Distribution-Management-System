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
  const stockConn = useRef<HubConnection | null>(null);

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
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    });

    conn.on('NewOrder', (data: { id: string; orderNumber: string }) => {
      toast.success(`New order #${data.orderNumber}`, { duration: 4000 });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    });

    conn.on('OrderStatusChanged', (data: { orderId: string; status: string }) => {
      toast(`Order status updated to ${data.status}`, { icon: '📦', duration: 4000 });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['rep-orders'] });
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
    });

    conn.on('PriceUpdated', (data: { name: string; sellingPrice: number }) => {
      toast(`Price updated: ${data.name}`, { icon: '💰', duration: 4000 });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['rep-catalog'] });
    });

    startConnection(conn, cancelled, 'NotificationHub');

    return () => safeStop(conn, cancelled);
  }, [isAuthenticated, createConnection, queryClient]);

  // Connect to OrderTrackingHub (all roles)
  useEffect(() => {
    if (!isAuthenticated) return;

    const cancelled = { value: false };
    const conn = createConnection('order-tracking');
    orderConn.current = conn;

    conn.on('OrderStatusChanged', (data: { orderId: string; status: string; reason?: string }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['rep-orders'] });
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
    });

    startConnection(conn, cancelled, 'OrderTrackingHub');

    return () => safeStop(conn, cancelled);
  }, [isAuthenticated, createConnection, queryClient]);

  // Connect to StockAlertHub (admin only)
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'Admin') return;

    const cancelled = { value: false };
    const conn = createConnection('stock-alerts');
    stockConn.current = conn;

    conn.on('StockAlert', (data: { productName: string; stockQuantity: number }) => {
      toast.error(`Low stock: ${data.productName} (${data.stockQuantity} left)`, { duration: 6000 });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    });

    startConnection(conn, cancelled, 'StockAlertHub');

    return () => safeStop(conn, cancelled);
  }, [isAuthenticated, user?.role, createConnection, queryClient]);

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
