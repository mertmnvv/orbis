import { cn } from '@/lib/utils';
import type { Platform } from '@/lib/types';

const PLATFORM_CONFIG: Record<
  Platform,
  { label: string; abbr: string; className: string }
> = {
  yemeksepeti: {
    label: 'Yemeksepeti',
    abbr: 'YS',
    className: 'bg-orange-500 text-white',
  },
  getir: {
    label: 'Getir',
    abbr: 'GT',
    className: 'bg-purple-700 text-white',
  },
  trendyol: {
    label: 'Trendyol',
    abbr: 'TY',
    className: 'bg-red-600 text-white',
  },
  pakettaksi: {
    label: 'Paket Taksi',
    abbr: 'PT',
    className: 'bg-sky-600 text-white',
  },
  manual: {
    label: 'Manuel',
    abbr: 'M',
    className: 'bg-gray-500 text-white',
  },
};

interface PlatformBadgeProps {
  platform: Platform;
  showFull?: boolean;
  className?: string;
}

export function PlatformBadge({
  platform,
  showFull = false,
  className,
}: PlatformBadgeProps) {
  const config = PLATFORM_CONFIG[platform];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-bold tracking-wide',
        config.className,
        className,
      )}
    >
      {showFull ? config.label : config.abbr}
    </span>
  );
}
