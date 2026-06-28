import Link from 'next/link';
import { MapPin } from 'lucide-react';
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

const STATUS_BORDER: Record<string, string> = {
  picked_up: 'border-l-[#f97316]',
  pending:   'border-l-[#f59e0b]',
  assigned:  'border-l-[#3b82f6]',
  delivered: 'border-l-[#22c55e]',
  cancelled: 'border-l-[#2a2a2a]',
};

interface OrderCardProps {
  order: OrderWithCourier;
}

export function OrderCard({ order }: OrderCardProps) {
  const eta = calcETA(order);
  const borderColor = STATUS_BORDER[order.status] ?? 'border-l-[#2a2a2a]';

  return (
    <Link href={`/orders/${order.id}`} className="block group">
      <div
        className={cn(
          'cursor-pointer border border-[#2a2a2a] bg-[#141414] transition-all duration-200 hover:bg-[#1e1e1e] hover:border-[#3a3a3a] rounded-xl border-l-4',
          borderColor,
          order.status === 'delivered' && 'opacity-60',
          order.status === 'cancelled' && 'opacity-40',
        )}
      >
        <div className="space-y-3 p-4">
          {/* Top row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <PlatformBadge platform={order.platform} />
              {order.platform_order_id && (
                <span className="font-mono text-xs text-[#52525b]">
                  #{order.platform_order_id}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={order.status} />
              <span className="whitespace-nowrap text-xs text-[#52525b]">
                {formatTimeAgo(order.created_at)}
              </span>
            </div>
          </div>

          {/* Customer */}
          <div>
            <p className="text-sm font-medium text-white">
              {order.customer_name}
            </p>
            <p className="mt-0.5 flex items-start gap-1 text-xs text-[#a1a1aa]">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-[#52525b]" />
              <span className="line-clamp-1">{order.customer_address}</span>
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#2a2a2a] pt-2">
            <div className="text-xs text-[#a1a1aa]">
              {order.courier ? (
                <span className="flex items-center gap-1.5">
                  <span>{VEHICLE_ICON[order.courier.vehicle_type]}</span>
                  <span className="font-medium text-white">{order.courier.name}</span>
                  {eta && (
                    <span className="text-[#52525b]">· {eta}</span>
                  )}
                </span>
              ) : (
                <span className="font-medium text-[#f59e0b]">
                  Kurye bekleniyor
                </span>
              )}
            </div>
            <span className="text-sm font-semibold text-white">
              {formatCurrency(order.total_amount)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
