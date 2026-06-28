'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Clock, Bike, Package, CheckCircle2, Inbox, ChefHat, Plus } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderCard } from '@/components/orders/OrderCard';
import { useOrders, useRealtimeOrders } from '@/hooks/useOrders';
import { sortOrders } from '@/lib/utils';
import type { OrderStatus, OrderWithCourier } from '@/lib/types';

type FilterTab = 'active' | OrderStatus | 'pending_payment';

const TABS: { value: FilterTab; label: string }[] = [
  { value: 'active',          label: 'Aktif' },
  { value: 'preparing',       label: 'Hazırlanıyor' },
  { value: 'pending',         label: 'Bekliyor' },
  { value: 'assigned',        label: 'Atandı' },
  { value: 'picked_up',       label: 'Yolda' },
  { value: 'delivered',       label: 'Teslim' },
  { value: 'pending_payment',  label: 'Tahsilat Bekleyenler' },
  { value: 'cancelled',       label: 'İptal' },
];

function filterOrders(orders: OrderWithCourier[], tab: FilterTab): OrderWithCourier[] {
  if (tab === 'active')
    return orders.filter((o) => ['preparing', 'pending', 'assigned', 'picked_up'].includes(o.status));
  if (tab === 'pending_payment')
    return orders.filter((o) => o.status === 'delivered' && o.payment_status === 'pending');
  return orders.filter((o) => o.status === tab);
}

function countForTab(orders: OrderWithCourier[], tab: FilterTab): number {
  return filterOrders(orders, tab).length;
}

interface StatCardProps {
  label: string;
  count: number;
  valueColor: string;
  icon: React.ReactNode;
}

function StatCard({ label, count, valueColor, icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg">{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${valueColor}`}>{count}</p>
      <p className="mt-0.5 text-xs text-[#52525b]">{label}</p>
    </div>
  );
}

function OrderGrid({ orders }: { orders: OrderWithCourier[] }) {
  if (orders.length === 0) {
    return (
      <div className="py-20 text-center flex flex-col items-center">
        <Inbox className="h-10 w-10 text-[#52525b]" />
        <p className="mt-3 text-sm text-[#52525b]">Bu kategoride sipariş yok</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-36 rounded-xl bg-[#1e1e1e]" />
      ))}
    </div>
  );
}

export function OrdersBoard() {
  const [activeTab, setActiveTab] = useState<FilterTab>('active');
  const { data: orders = [], isLoading, refetch, isFetching } = useOrders();
  const { isConnected } = useRealtimeOrders();
  const sorted = sortOrders(orders);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Siparişler</h1>
          <p className="mt-0.5 text-sm text-[#52525b]">
            {new Date().toLocaleDateString('tr-TR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
              isConnected
                ? 'border-[#14532d40] bg-[#14532d20] text-[#22c55e]'
                : 'border-[#2a2a2a] bg-[#141414] text-[#52525b]'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isConnected ? 'animate-pulse bg-[#22c55e]' : 'bg-[#52525b]'
              }`}
            />
            {isConnected ? 'Canlı' : 'Bağlanıyor…'}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-[#2a2a2a] bg-[#141414] text-[#a1a1aa] hover:bg-[#1e1e1e] hover:text-white"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
          <Link
            href="/orders/new"
            className="flex items-center gap-1.5 rounded-xl bg-[#f97316] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ea6c0a] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Yeni Sipariş
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Hazırlanıyor" count={countForTab(orders, 'preparing')} valueColor="text-[#a855f7]" icon={<ChefHat className="h-5 w-5 text-[#a855f7]" />} />
        <StatCard label="Bekliyor"      count={countForTab(orders, 'pending')}   valueColor="text-[#f59e0b]" icon={<Clock className="h-5 w-5 text-[#f59e0b]" />} />
        <StatCard label="Atandı"        count={countForTab(orders, 'assigned')}  valueColor="text-[#60a5fa]" icon={<Bike className="h-5 w-5 text-[#60a5fa]" />} />
        <StatCard label="Yolda"         count={countForTab(orders, 'picked_up')} valueColor="text-[#f97316]" icon={<Package className="h-5 w-5 text-[#f97316]" />} />
        <StatCard label="Teslim Bugün"  count={countForTab(orders, 'delivered')} valueColor="text-[#22c55e]" icon={<CheckCircle2 className="h-5 w-5 text-[#22c55e]" />} />
      </div>

      {/* Tabs + grid */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
        <div className="overflow-x-auto">
          <TabsList className="mb-4 bg-[#141414] border border-[#2a2a2a]">
            {TABS.map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="data-[state=active]:bg-[#1e1e1e] data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#f97316] text-[#52525b] hover:text-[#a1a1aa]"
              >
                {label}
                <span className="ml-1.5 rounded-full bg-[#1e1e1e] px-1.5 py-0.5 text-xs font-medium text-[#a1a1aa]">
                  {countForTab(orders, value)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {TABS.map(({ value }) => (
          <TabsContent key={value} value={value}>
            {isLoading ? <LoadingSkeleton /> : <OrderGrid orders={filterOrders(sorted, value)} />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
