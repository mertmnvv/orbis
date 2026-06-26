'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderCard } from '@/components/orders/OrderCard';
import { useOrders, useRealtimeOrders } from '@/hooks/useOrders';
import { sortOrders } from '@/lib/utils';
import type { OrderStatus, OrderWithCourier } from '@/lib/types';

type FilterTab = 'active' | OrderStatus;

const TABS: { value: FilterTab; label: string }[] = [
  { value: 'active', label: 'Aktif' },
  { value: 'pending', label: 'Bekliyor' },
  { value: 'assigned', label: 'Atandı' },
  { value: 'picked_up', label: 'Yolda' },
  { value: 'delivered', label: 'Teslim' },
  { value: 'cancelled', label: 'İptal' },
];

function filterOrders(
  orders: OrderWithCourier[],
  tab: FilterTab,
): OrderWithCourier[] {
  if (tab === 'active')
    return orders.filter((o) =>
      ['pending', 'assigned', 'picked_up'].includes(o.status),
    );
  return orders.filter((o) => o.status === tab);
}

function countForTab(orders: OrderWithCourier[], tab: FilterTab): number {
  return filterOrders(orders, tab).length;
}

interface StatCardProps {
  label: string;
  count: number;
  colorClass: string;
}

function StatCard({ label, count, colorClass }: StatCardProps) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className={`text-2xl font-bold ${colorClass}`}>{count}</p>
      <p className="mt-0.5 text-xs text-gray-500">{label}</p>
    </div>
  );
}

function OrderGrid({ orders }: { orders: OrderWithCourier[] }) {
  if (orders.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-4xl">📭</p>
        <p className="mt-3 text-sm text-gray-400">
          Bu kategoride sipariş yok
        </p>
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
        <Skeleton key={i} className="h-36 rounded-lg" />
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
          <h1 className="text-xl font-semibold text-gray-900">Siparişler</h1>
          <p className="mt-0.5 text-sm text-gray-500">
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
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-gray-200 bg-gray-50 text-gray-500'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isConnected
                  ? 'animate-pulse bg-green-500'
                  : 'bg-gray-400'
              }`}
            />
            {isConnected ? 'Canlı' : 'Bağlanıyor…'}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
            />
            Yenile
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Bekliyor"
          count={countForTab(orders, 'pending')}
          colorClass="text-amber-600"
        />
        <StatCard
          label="Atandı"
          count={countForTab(orders, 'assigned')}
          colorClass="text-blue-600"
        />
        <StatCard
          label="Yolda"
          count={countForTab(orders, 'picked_up')}
          colorClass="text-orange-600"
        />
        <StatCard
          label="Teslim Bugün"
          count={countForTab(orders, 'delivered')}
          colorClass="text-green-600"
        />
      </div>

      {/* Tabs + grid */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as FilterTab)}
      >
        <div className="overflow-x-auto">
          <TabsList className="mb-4">
            {TABS.map(({ value, label }) => (
              <TabsTrigger key={value} value={value}>
                {label}
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                  {countForTab(orders, value)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {TABS.map(({ value }) => (
          <TabsContent key={value} value={value}>
            {isLoading ? (
              <LoadingSkeleton />
            ) : (
              <OrderGrid orders={filterOrders(sorted, value)} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
