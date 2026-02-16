import { format, formatDistanceToNow } from 'date-fns';

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(amount);

export const formatDate = (date: string | Date) =>
  format(new Date(date), 'MMM dd, yyyy');

export const formatDateTime = (date: string | Date) =>
  format(new Date(date), 'MMM dd, yyyy HH:mm');

export const formatRelative = (date: string | Date) =>
  formatDistanceToNow(new Date(date), { addSuffix: true });

export const formatPhone = (phone: string) => phone;

export const statusColor = (status: string): string => {
  const map: Record<string, string> = {
    Pending: 'bg-yellow-100 text-yellow-800',
    Approved: 'bg-blue-100 text-blue-800',
    Processing: 'bg-indigo-100 text-indigo-800',
    Dispatched: 'bg-purple-100 text-purple-800',
    Delivered: 'bg-green-100 text-green-800',
    Cancelled: 'bg-red-100 text-red-800',
    Rejected: 'bg-red-100 text-red-800',
    Verified: 'bg-green-100 text-green-800',
    InStock: 'bg-green-100 text-green-800',
    OutOfStock: 'bg-red-100 text-red-800',
    LowStock: 'bg-yellow-100 text-yellow-800',
    Active: 'bg-green-100 text-green-800',
    Inactive: 'bg-gray-100 text-gray-800',
  };
  return map[status] || 'bg-gray-100 text-gray-800';
};

export const cn = (...classes: (string | undefined | false)[]) =>
  classes.filter(Boolean).join(' ');
