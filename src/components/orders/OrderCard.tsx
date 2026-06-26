import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/orders/StatusBadge';
import { PlatformBadge } from '@/components/shared/PlatformBadge';
import { cn, formatTimeAgo, formatCurrency, calcETA } from '@/lib/utils';
import type { OrderWithCourier, VehicleType } from '@/lib/types';

const VEHICLE_ICON: Record<VehicleType, string> = {
  bicycle: '🚲',
  motorcycle: '🏍',
  scooter: '🛵',
  car: '🚗',
  on_foot: '🚶',
};

interface OrderCardProps {
  order: OrderWithCourier;
}

export function OrderCard({ order }: OrderCardProps) {
  const eta = calcETA(order);

  return (
    <Link href={`/orders/${order.id}`} className="block group">
      <Card
        className={cn(
          'cursor-pointer border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
          order.status === 'picked_up' && 'border-l-4 border-l-orange-400',
          order.status === 'pending' && 'border-l-4 border-l-amber-400',
          order.status === 'assigned' && 'border-l-4 border-l-blue-400',
          order.status === 'delivered' && 'opacity-60',
          order.status === 'cancelled' && 'opacity-40',
        )}
      >
        <CardContent className="space-y-3 p-4">
          {/* Top row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <PlatformBadge platform={order.platform} />
              {order.platform_order_id && (
                <span className="font-mono text-xs text-gray-400">
                  #{order.platform_order_id}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={order.status} />
              <span className="whitespace-nowrap text-xs text-gray-400">
                {formatTimeAgo(order.created_at)}
              </span>
            </div>
          </div>

          {/* Customer */}
          <div>
            <p className="text-sm font-medium text-gray-900">
              {order.customer_name}
            </p>
            <p className="mt-0.5 flex items-start gap-1 text-xs text-gray-500">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" />
              <span className="line-clamp-1">{order.customer_address}</span>
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-50 pt-2">
            <div className="text-xs text-gray-600">
              {order.courier ? (
                <span className="flex items-center gap-1.5">
                  <span>{VEHICLE_ICON[order.courier.vehicle_type]}</span>
                  <span className="font-medium">{order.courier.name}</span>
                  {eta && (
                    <span className="text-gray-400">· {eta}</span>
                  )}
                </span>
              ) : (
                <span className="font-medium text-amber-600">
                  Kurye bekleniyor
                </span>
              )}
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(order.total_amount)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
