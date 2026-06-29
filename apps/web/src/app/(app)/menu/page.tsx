'use client';

import { useState, useMemo, useRef } from 'react';
import { Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight, UtensilsCrossed, FolderPlus, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useMenuItems, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem } from '@/hooks/useMenuItems';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import { MenuItem } from '@/lib/types';

function useRestaurantId() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['restaurant_id', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      return data?.id ?? null;
    },
    enabled: !!user?.id,
  });
}

interface EditingItem {
  category: string;
  name: string;
  description: string;
  price: string;
  is_available: boolean;
  stock_count: string;
}

const EMPTY_FORM: EditingItem = {
  category: '',
  name: '',
  description: '',
  price: '',
  is_available: true,
  stock_count: '',
};

export default function MenuPage() {
  const { data: restaurantId } = useRestaurantId();
  const { data: items = [], isLoading } = useMenuItems(restaurantId ?? null);
  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const deleteItem = useDeleteMenuItem();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // Draft categories: categories created in sidebar before any item is added
  const [draftCategories, setDraftCategories] = useState<string[]>([]);
  // Category creation form state
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const categoryInputRef = useRef<HTMLInputElement>(null);

  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [newForm, setNewForm] = useState<EditingItem>(EMPTY_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Categories from DB items
  const dbCategories = useMemo(() => {
    const cats = Array.from(new Set(items.map((i) => i.category)));
    return cats.sort();
  }, [items]);

  // All categories = DB + drafts (deduplicated)
  const allCategories = useMemo(() => {
    const merged = Array.from(new Set([...dbCategories, ...draftCategories]));
    return merged.sort();
  }, [dbCategories, draftCategories]);

  const activeCategory = selectedCategory ?? allCategories[0] ?? null;

  const filteredItems = useMemo(
    () => (activeCategory ? items.filter((i) => i.category === activeCategory) : []),
    [items, activeCategory],
  );

  function openCategoryForm() {
    setShowCategoryForm(true);
    setNewCategoryName('');
    setTimeout(() => categoryInputRef.current?.focus(), 50);
  }

  function confirmAddCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    if (allCategories.includes(name)) {
      toast.info('Bu kategori zaten var');
      setSelectedCategory(name);
      setShowCategoryForm(false);
      return;
    }
    setDraftCategories((prev) => [...prev, name]);
    setSelectedCategory(name);
    setShowCategoryForm(false);
    setNewCategoryName('');
    // Auto-open new item form for this category
    setNewForm({ ...EMPTY_FORM, category: name });
    setShowNewItemForm(true);
  }

  function startEdit(item: MenuItem) {
    setEditingId(item.id);
    setEditingItem({
      category: item.category,
      name: item.name,
      description: item.description ?? '',
      price: String(item.price),
      is_available: item.is_available,
      stock_count: item.stock_count != null ? String(item.stock_count) : '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingItem(null);
  }

  async function saveEdit() {
    if (!editingItem || !editingId) return;
    const price = parseFloat(editingItem.price);
    if (!editingItem.name.trim() || isNaN(price)) {
      toast.error('Ad ve fiyat zorunlu');
      return;
    }
    try {
      const stock = editingItem.stock_count === '' ? null : parseInt(editingItem.stock_count, 10);
      await updateItem.mutateAsync({
        id: editingId,
        name: editingItem.name.trim(),
        description: editingItem.description.trim() || null,
        price,
        category: editingItem.category.trim() || 'Genel',
        is_available: editingItem.is_available,
        stock_count: isNaN(stock as number) ? null : stock,
      });
      toast.success('Ürün güncellendi');
      cancelEdit();
    } catch {
      toast.error('Güncelleme başarısız');
    }
  }

  async function toggleAvailability(item: MenuItem) {
    try {
      await updateItem.mutateAsync({ id: item.id, is_available: !item.is_available });
    } catch {
      toast.error('Durum değiştirilemedi');
    }
  }

  async function handleCreate() {
    if (!restaurantId) {
      toast.error('Önce Ayarlar sayfasından restoran bilgilerinizi kaydedin');
      return;
    }
    const price = parseFloat(newForm.price);
    if (!newForm.name.trim() || isNaN(price)) {
      toast.error('Ad ve fiyat zorunlu');
      return;
    }
    const categoryName = newForm.category.trim() || activeCategory || 'Genel';
    const newStock = newForm.stock_count === '' ? null : parseInt(newForm.stock_count, 10);
    try {
      await createItem.mutateAsync({
        restaurant_id: restaurantId,
        name: newForm.name.trim(),
        description: newForm.description.trim() || null,
        price,
        category: categoryName,
        is_available: newForm.is_available,
        stock_count: isNaN(newStock as number) ? null : newStock,
      });
      toast.success('Ürün eklendi');
      // Remove from drafts once an item is actually created in this category
      setDraftCategories((prev) => prev.filter((c) => c !== categoryName));
      setNewForm({ ...EMPTY_FORM, category: categoryName });
      setShowNewItemForm(false);
      setSelectedCategory(categoryName);
    } catch {
      toast.error('Eklenemedi');
    }
  }

  async function handleDelete(item: MenuItem) {
    try {
      await deleteItem.mutateAsync({ id: item.id, restaurant_id: item.restaurant_id });
      toast.success('Ürün silindi');
      setConfirmDeleteId(null);
    } catch {
      toast.error('Silinemedi');
    }
  }

  const isDraftCategory = activeCategory !== null && !dbCategories.includes(activeCategory);

  return (
    <div className="flex h-full bg-[#0a0a0a]">
      {/* Left: Category List */}
      <aside className="w-60 shrink-0 border-r border-[#2a2a2a] bg-[#141414] flex flex-col">
        <div className="border-b border-[#2a2a2a] px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white">Kategoriler</span>
            <span className="text-xs text-[#52525b]">{allCategories.length} kategori</span>
          </div>

          {/* Category Add Form */}
          {showCategoryForm ? (
            <div className="flex gap-2">
              <input
                ref={categoryInputRef}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmAddCategory();
                  if (e.key === 'Escape') setShowCategoryForm(false);
                }}
                placeholder="Kategori adı..."
                className="flex-1 min-w-0 rounded-lg border border-[#f97316]/50 bg-[#1a1a1a] px-2.5 py-1.5 text-xs text-white placeholder-[#52525b] focus:border-[#f97316] focus:outline-none"
              />
              <button
                onClick={confirmAddCategory}
                disabled={!newCategoryName.trim()}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f97316] text-white hover:bg-[#ea6c0a] disabled:opacity-40 transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setShowCategoryForm(false)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#2a2a2a] text-[#52525b] hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={openCategoryForm}
              className="flex w-full items-center gap-2 rounded-lg border border-dashed border-[#2a2a2a] px-3 py-2 text-xs text-[#52525b] hover:border-[#f97316]/40 hover:text-[#a1a1aa] transition-colors"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              Yeni Kategori Ekle
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-0.5 p-2 overflow-y-auto">
          {isLoading ? (
            <div className="px-3 py-2 text-xs text-[#52525b]">Yükleniyor...</div>
          ) : allCategories.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <UtensilsCrossed className="mx-auto mb-2 h-7 w-7 text-[#2a2a2a]" />
              <p className="text-xs text-[#52525b]">Henüz kategori yok</p>
              <p className="mt-1 text-xs text-[#3a3a3a]">Yukarıdan kategori ekleyin</p>
            </div>
          ) : (
            allCategories.map((cat) => {
              const isDraft = !dbCategories.includes(cat);
              const count = items.filter((i) => i.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                    activeCategory === cat
                      ? 'bg-[#1e1e1e] text-white border-l-2 border-[#f97316]'
                      : 'text-[#a1a1aa] hover:bg-[#1e1e1e] hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="flex-1 truncate">{cat}</span>
                    {isDraft ? (
                      <span className="rounded-full border border-[#f97316]/30 px-1.5 py-0.5 text-[10px] text-[#f97316]/70">
                        yeni
                      </span>
                    ) : (
                      <span className="text-xs text-[#52525b]">({count})</span>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </nav>
      </aside>

      {/* Right: Items Panel */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">
                {activeCategory ?? 'Menü Yönetimi'}
              </h1>
              {isDraftCategory && (
                <span className="rounded-full border border-[#f97316]/30 bg-[#f97316]/10 px-2 py-0.5 text-xs text-[#f97316]">
                  Yeni kategori — ilk ürünü ekleyin
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-[#71717a]">
              {activeCategory
                ? isDraftCategory
                  ? 'Bu kategori henüz boş. Aşağıdan ürün ekleyebilirsiniz.'
                  : `${filteredItems.length} ürün`
                : 'Soldan bir kategori seçin veya yeni kategori oluşturun'}
            </p>
          </div>
          {activeCategory && (
            <button
              onClick={() => {
                setNewForm({ ...EMPTY_FORM, category: activeCategory });
                setShowNewItemForm(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-[#f97316] px-4 py-2 text-sm font-medium text-white hover:bg-[#ea6c0a] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Ürün Ekle
            </button>
          )}
        </div>

        {/* New Item Form */}
        {showNewItemForm && (
          <div className="mb-4 rounded-xl border border-[#f97316]/30 bg-[#1a1a1a] p-4">
            <p className="mb-3 text-sm font-semibold text-white">Yeni Ürün</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                autoFocus
                placeholder="Ürün adı *"
                value={newForm.name}
                onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                className="col-span-2 rounded-lg border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-white placeholder-[#52525b] focus:border-[#f97316] focus:outline-none"
              />
              <div className="relative">
                <input
                  placeholder="Kategori"
                  value={newForm.category}
                  onChange={(e) => setNewForm((f) => ({ ...f, category: e.target.value }))}
                  list="category-suggestions"
                  className="w-full rounded-lg border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-white placeholder-[#52525b] focus:border-[#f97316] focus:outline-none"
                />
                <datalist id="category-suggestions">
                  {allCategories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <input
                placeholder="Fiyat (₺) *"
                type="number"
                min="0"
                step="0.50"
                value={newForm.price}
                onChange={(e) => setNewForm((f) => ({ ...f, price: e.target.value }))}
                className="rounded-lg border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-white placeholder-[#52525b] focus:border-[#f97316] focus:outline-none"
              />
              <input
                placeholder="Açıklama (isteğe bağlı)"
                value={newForm.description}
                onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))}
                className="col-span-2 rounded-lg border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-white placeholder-[#52525b] focus:border-[#f97316] focus:outline-none"
              />
              <div className="col-span-2">
                <input
                  placeholder="Stok adedi (boş = sınırsız)"
                  type="number"
                  min="0"
                  step="1"
                  value={newForm.stock_count}
                  onChange={(e) => setNewForm((f) => ({ ...f, stock_count: e.target.value }))}
                  className="w-full rounded-lg border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-white placeholder-[#52525b] focus:border-[#f97316] focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-[#a1a1aa] cursor-pointer">
                <input
                  type="checkbox"
                  checked={newForm.is_available}
                  onChange={(e) => setNewForm((f) => ({ ...f, is_available: e.target.checked }))}
                  className="accent-[#f97316]"
                />
                Müsait
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewItemForm(false)}
                  className="rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-sm text-[#a1a1aa] hover:text-white transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleCreate}
                  disabled={createItem.isPending}
                  className="rounded-lg bg-[#f97316] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#ea6c0a] disabled:opacity-50 transition-colors"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Items List */}
        {!activeCategory ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <UtensilsCrossed className="h-10 w-10 text-[#2a2a2a] mb-3" />
            <p className="text-[#52525b]">Soldan bir kategori seçin</p>
          </div>
        ) : filteredItems.length === 0 && !showNewItemForm ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UtensilsCrossed className="h-10 w-10 text-[#2a2a2a] mb-3" />
            <p className="text-[#52525b]">Bu kategoride henüz ürün yok</p>
            <button
              onClick={() => {
                setNewForm({ ...EMPTY_FORM, category: activeCategory });
                setShowNewItemForm(true);
              }}
              className="mt-4 flex items-center gap-2 rounded-lg bg-[#f97316] px-4 py-2 text-sm font-medium text-white hover:bg-[#ea6c0a] transition-colors"
            >
              <Plus className="h-4 w-4" />
              İlk Ürünü Ekle
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) =>
              editingId === item.id && editingItem ? (
                /* Inline edit row */
                <div key={item.id} className="rounded-xl border border-[#f97316]/30 bg-[#1a1a1a] p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={editingItem.name}
                      onChange={(e) => setEditingItem((f) => f && ({ ...f, name: e.target.value }))}
                      className="col-span-2 rounded-lg border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-white focus:border-[#f97316] focus:outline-none"
                    />
                    <input
                      value={editingItem.category}
                      onChange={(e) => setEditingItem((f) => f && ({ ...f, category: e.target.value }))}
                      list="category-suggestions"
                      className="rounded-lg border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-white focus:border-[#f97316] focus:outline-none"
                    />
                    <input
                      type="number"
                      value={editingItem.price}
                      onChange={(e) => setEditingItem((f) => f && ({ ...f, price: e.target.value }))}
                      className="rounded-lg border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-white focus:border-[#f97316] focus:outline-none"
                    />
                    <input
                      value={editingItem.description}
                      onChange={(e) => setEditingItem((f) => f && ({ ...f, description: e.target.value }))}
                      placeholder="Açıklama"
                      className="col-span-2 rounded-lg border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-white placeholder-[#52525b] focus:border-[#f97316] focus:outline-none"
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editingItem.stock_count}
                      onChange={(e) => setEditingItem((f) => f && ({ ...f, stock_count: e.target.value }))}
                      placeholder="Stok (boş = sınırsız)"
                      className="col-span-2 rounded-lg border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-white placeholder-[#52525b] focus:border-[#f97316] focus:outline-none"
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-[#a1a1aa] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingItem.is_available}
                        onChange={(e) => setEditingItem((f) => f && ({ ...f, is_available: e.target.checked }))}
                        className="accent-[#f97316]"
                      />
                      Müsait
                    </label>
                    <div className="flex gap-2">
                      <button onClick={cancelEdit} className="flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-sm text-[#a1a1aa] hover:text-white transition-colors">
                        <X className="h-3.5 w-3.5" /> İptal
                      </button>
                      <button onClick={saveEdit} disabled={updateItem.isPending} className="flex items-center gap-1.5 rounded-lg bg-[#f97316] px-3 py-1.5 text-sm text-white hover:bg-[#ea6c0a] disabled:opacity-50 transition-colors">
                        <Check className="h-3.5 w-3.5" /> Kaydet
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Normal row */
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-xl border border-[#2a2a2a] bg-[#141414] px-4 py-3 hover:border-[#3a3a3a] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${item.is_available ? 'text-white' : 'text-[#52525b] line-through'}`}>
                        {item.name}
                      </span>
                      {!item.is_available && (
                        <span className="rounded-full bg-[#2a2a2a] px-2 py-0.5 text-xs text-[#71717a]">
                          Tükendi
                        </span>
                      )}
                      {item.stock_count != null && item.is_available && (
                        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${item.stock_count <= 3 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-[#1e1e1e] text-[#52525b]'}`}>
                          <Package className="h-2.5 w-2.5" />
                          {item.stock_count}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="mt-0.5 truncate text-xs text-[#71717a]">{item.description}</p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-[#f97316]">
                    {formatCurrency(item.price)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleAvailability(item)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[#52525b] hover:text-[#a1a1aa] transition-colors"
                      title={item.is_available ? 'Tükendi işaretle' : 'Müsait yap'}
                    >
                      {item.is_available ? (
                        <ToggleRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => startEdit(item)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[#52525b] hover:text-[#a1a1aa] transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {confirmDeleteId === item.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(item)}
                          className="rounded-lg bg-red-500/20 px-2 py-1 text-xs text-red-400 hover:bg-red-500/30 transition-colors"
                        >
                          Evet, sil
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg px-2 py-1 text-xs text-[#52525b] hover:text-white transition-colors"
                        >
                          Vazgeç
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#52525b] hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </main>
    </div>
  );
}
