import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/lib/types';

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; className: string; dotClass: string }
> = {
  pending: {
    label: 'Bekliyor',
    className: 'bg-[#78350f20] text-[#f59e0b] border-[#78350f40]',
    dotClass: 'bg-[#f59e0b]',
  },
  assigned: {
    label: 'Atandı',
    className: 'bg-[#1e3a5f] text-[#60a5fa] border-[#1e40af40]',
    dotClass: 'bg-[#3b82f6]',
  },
  picked_up: {
    label: 'Yolda',
    className: 'bg-[#431407] text-[#f97316] border-[#7c2d1240]',
    dotClass: 'bg-[#f97316] animate-pulse',
  },
  delivered: {
    label: 'Teslim',
    className: 'bg-[#14532d20] text-[#22c55e] border-[#14532d40]',
    dotClass: 'bg-[#22c55e]',
  },
  cancelled: {
    label: 'İptal',
    className: 'bg-[#1c1c1c] text-[#71717a] border-[#2a2a2a]',
    dotClass: 'bg-[#71717a]',
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
