'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { ZonesList } from '@/components/zones/ZonesList';
import { useZones } from '@/hooks/useZones';

const ZoneMap = dynamic(
  () => import('@/components/zones/ZoneMap').then((m) => m.ZoneMap),
  { ssr: false }
);

export default function ZonesPage() {
  const { data: zones = [], isLoading } = useZones();
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="flex h-full">
      {/* Left: zones list */}
      <div className="w-64 shrink-0">
        {isLoading ? (
          <div className="flex h-full items-center justify-center bg-[#141414]">
            <div className="h-5 w-5 rounded-full border-2 border-[#f97316] border-t-transparent animate-spin" />
          </div>
        ) : (
          <ZonesList
            zones={zones}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(selectedId === id ? null : id)}
            onAddNew={() => setIsDrawing(true)}
            isDrawing={isDrawing}
          />
        )}
      </div>

      {/* Right: map */}
      <div className="flex-1">
        <ZoneMap
          zones={zones}
          isDrawing={isDrawing}
          onDrawingEnd={() => setIsDrawing(false)}
          selectedId={selectedId}
        />
      </div>
    </div>
  );
}
