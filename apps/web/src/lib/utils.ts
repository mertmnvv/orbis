import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { OrderStatus, OrderWithCourier } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'şimdi';
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
  return `${Math.floor(diff / 86400)} gün önce`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function calcETA(order: OrderWithCourier): string | null {
  switch (order.status) {
    case 'pending':
      return 'Kurye bekleniyor';
    case 'assigned':
      return '~25-30 dk';
    case 'picked_up': {
      if (!order.picked_up_at) return '~20 dk';
      const remainingMs =
        new Date(order.picked_up_at).getTime() + 30 * 60_000 - Date.now();
      const mins = Math.ceil(remainingMs / 60_000);
      return mins > 0 ? `~${mins} dk` : 'Teslim ediliyor';
    }
    default:
      return null;
  }
}

const STATUS_ORDER: Record<OrderStatus, number> = {
  pending: 0,
  assigned: 1,
  picked_up: 2,
  delivered: 3,
  cancelled: 4,
};

export function sortOrders(orders: OrderWithCourier[]): OrderWithCourier[] {
  return [...orders].sort((a, b) => {
    const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (s !== 0) return s;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
