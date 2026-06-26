import type { Metadata } from 'next';
import { OrdersBoard } from '@/components/orders/OrdersBoard';

export const metadata: Metadata = { title: 'Siparişler — Orbis' };

export default function DashboardPage() {
  return <OrdersBoard />;
}
