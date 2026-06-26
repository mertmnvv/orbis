import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/lib/types';

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; className: string; dotClass: string }
> = {
  pending: {
    label: 'Bekliyor',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-400',
  },
  assigned: {
    label: 'Atandı',
    className: 'bg-blue-50 text-blue-800 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  picked_up: {
    label: 'Yolda',
    className: 'bg-orange-50 text-orange-800 border-orange-200',
    dotClass: 'bg-orange-500 animate-pulse',
  },
  delivered: {
    label: 'Teslim',
    className: 'bg-green-50 text-green-800 border-green-200',
    dotClass: 'bg-green-500',
  },
  cancelled: {
    label: 'İptal',
    className: 'bg-gray-50 text-gray-500 border-gray-200',
    dotClass: 'bg-gray-400',
  },
};

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dotClass)} />
      {config.label}
    </span>
  );
}
