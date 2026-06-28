'use client';

import { Trash2, Eye, EyeOff } from 'lucide-react';
import { ZONE_COLORS, useDeleteZone, useUpdateZone, type DeliveryZone } from '@/hooks/useZones';

interface ZonesListProps {
  zones: DeliveryZone[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddNew: () => void;
  isDrawing: boolean;
}

export function ZonesList({ zones, selectedId, onSelect, onAddNew, isDrawing }: ZonesListProps) {
  const deleteMutation = useDeleteZone();
  const updateMutation = useUpdateZone();

  return (
    <div className="flex h-full flex-col bg-[#141414] border-r border-[#2a2a2a]">
      {/* Header */}
      <div className="border-b border-[#2a2a2a] p-4">
        <h2 className="text-sm font-bold text-white mb-1">Teslimat Bölgeleri</h2>
        <p className="text-xs text-[#52525b]">{zones.length} bölge tanımlı</p>
      </div>

      {/* Add button */}
      <div className="p-3 border-b border-[#2a2a2a]">
        <button
          onClick={onAddNew}
          disabled={isDrawing}
          className="w-full rounded-xl bg-[#f97316] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#ea6c0a] active:bg-[#c2590a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDrawing ? 'Çizim modu aktif…' : '+ Yeni Bölge Ekle'}
        </button>
      </div>

      {/* Color legend */}
      <div className="px-3 py-2 flex gap-1.5 flex-wrap border-b border-[#2a2a2a]">
        {ZONE_COLORS.map((color) => (
          <div
            key={color}
            className="h-4 w-4 rounded-full border border-[#2a2a2a]"
            style={{ backgroundColor: color }}
          />
        ))}
        <span className="text-xs text-[#52525b] ml-1 self-center">Renk seçenekleri</span>
      </div>

      {/* Zones list */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#2a2a2a]">
        {zones.length === 0 && (
          <div className="p-6 text-center">
            <p className="text-3xl mb-2">🗺️</p>
            <p className="text-xs text-[#52525b]">Henüz bölge yok.</p>
            <p className="text-xs text-[#52525b]">Haritada poligon çizerek bölge ekleyin.</p>
          </div>
        )}
        {zones.map((zone) => (
          <div
            key={zone.id}
            className={`group flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors ${
              selectedId === zone.id ? 'bg-[#1e1e1e]' : 'hover:bg-[#1a1a1a]'
            }`}
            onClick={() => onSelect(zone.id)}
          >
            <div
              className="h-8 w-8 shrink-0 rounded-lg border border-[#2a2a2a]"
              style={{ backgroundColor: zone.color + '33', borderColor: zone.color + '80' }}
            >
              <div className="h-full w-full rounded-lg flex items-center justify-center">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: zone.color }} />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{zone.name}</p>
              <p className="text-xs text-[#52525b]">{zone.is_active ? 'Aktif' : 'Pasif'}</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateMutation.mutate({ id: zone.id, is_active: !zone.is_active });
                }}
                className="p-1 rounded-lg hover:bg-[#2a2a2a] text-[#52525b] hover:text-[#a1a1aa] transition-colors"
                title={zone.is_active ? 'Pasif yap' : 'Aktif yap'}
              >
                {zone.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`"${zone.name}" bölgesini silmek istediğinizden emin misiniz?`)) {
                    deleteMutation.mutate(zone.id);
                  }
                }}
                className="p-1 rounded-lg hover:bg-[#ef444420] text-[#52525b] hover:text-[#ef4444] transition-colors"
                title="Bölgeyi sil"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
