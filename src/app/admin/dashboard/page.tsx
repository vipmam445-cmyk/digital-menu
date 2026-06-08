"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MenuItem, Category as CatType } from "@/data/menuData";
import { Language } from "@/data/translations";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  LogOut, Edit3, Trash2, Eye, EyeOff, Plus, ChevronLeft, Star, X, Save, RefreshCw,
  MessageSquare, AlertTriangle, Search, Filter, ArrowUpDown, Upload, Image,
} from "lucide-react";
import {
  getAllMenuItems, upsertMenuItem, upsertMenuItems, deleteMenuItem,
  getAllCategories, createCategory, updateCategory, deleteCategory,
  getAllReviews, addReview, deleteReview,
  subscribeToMenuItems, subscribeToCategories,
} from "@/lib/db/database";

interface Review {
  id: string; itemId: string; author: string; rating: number; comment: string; date: string;
}

type TabMode = "items" | "categories" | "messages";

const LANGUAGES: Language[] = ["en", "am", "or"];

const emptyItem = (): MenuItem => ({
  id: `item_${Date.now()}`, category: "breakfast",
  name: { en: "", am: "", or: "" }, description: { en: "", am: "", or: "" },
  ingredients: { en: [], am: [], or: [] }, allergens: { en: [], am: [], or: [] },
  price: 0, calories: 0, prep_time: "10-15", image: "", rating: 4.5,
  is_best_seller: false, is_signature: false, is_new: false, is_spicy: false,
  is_available: true, isFasting: false,
});

export default function AdminDashboard() {
  const { t } = useLanguage();
  const router = useRouter();
  const [auth, setAuth] = useState(false);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [originalItems, setOriginalItems] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [categories, setCategories] = useState<CatType[]>([]);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [editingCat, setEditingCat] = useState<CatType | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showCatEditor, setShowCatEditor] = useState(false);
  const [mode, setMode] = useState<TabMode>("items");
  const [filter, setFilter] = useState<string>("all");
  const [itemSearch, setItemSearch] = useState("");
  const [sortField, setSortField] = useState<"name" | "price" | "category">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasChanges = useMemo(
    () => JSON.stringify(originalItems) !== JSON.stringify(items),
    [originalItems, items]
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/admin"); return; }
      setAuth(true);
      loadData();
    });
  }, [router]);

  useEffect(() => {
    if (!auth) return;
    const unsub1 = subscribeToMenuItems(() => loadItems());
    const unsub2 = subscribeToCategories(() => loadCategories());
    return () => {
      unsub1.unsubscribe();
      unsub2.unsubscribe();
    };
  }, [auth]);

  async function loadData() {
    await Promise.all([loadItems(), loadCategories(), loadReviews()]);
  }

  async function loadItems() {
    try {
      const data = await getAllMenuItems();
      setItems(data);
      setOriginalItems(data);
    } catch { console.error("Failed to load items"); }
  }

  async function loadCategories() {
    try {
      setCategories(await getAllCategories());
    } catch { console.error("Failed to load categories"); }
  }

  async function loadReviews() {
    try {
      setReviews(await getAllReviews());
    } catch { console.error("Failed to load reviews"); }
  }

  // ─── Items CRUD ─────────────────────────────────────────────

  const saveAll = async () => {
    setSaving(true);
    try {
      await upsertMenuItems(items);
      setOriginalItems([...items]);
    } catch (e: any) { alert("Save failed: " + e.message); }
    setSaving(false);
  };

  const undoChanges = () => setItems([...originalItems]);

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this item permanently?")) return;
    try {
      await deleteMenuItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) { alert("Delete failed: " + e.message); }
  };

  const toggleAvailability = (id: string) =>
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, is_available: !i.is_available } : i))
    );

  const openEditor = (item?: MenuItem) => {
    setEditing(item ? { ...item } : emptyItem());
    setShowEditor(true);
  };

  const handleSaveItem = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await upsertMenuItem(editing);
      setItems((prev) => {
        const ex = prev.find((i) => i.id === editing.id);
        return ex
          ? prev.map((i) => (i.id === editing.id ? editing : i))
          : [...prev, editing];
      });
      setShowEditor(false);
      setEditing(null);
    } catch (e: any) { alert("Save failed: " + e.message); }
    setSaving(false);
  };

  const updateField = (field: string, value: any) => {
    if (!editing) return;
    setEditing({ ...editing, [field]: value });
  };

  const updateTranslatedField = (
    field: "name" | "description",
    lang: Language,
    value: string
  ) => {
    if (!editing) return;
    const current = (editing[field] as any) || {};
    const updated: any = { ...current, [lang]: value };
    if (lang === "en" && value && editing.id.startsWith("item_")) {
      if (!current.am) updated.am = value;
      if (!current.or) updated.or = value;
    }
    setEditing({ ...editing, [field]: updated } as MenuItem);
  };

  const updateArrayField = (
    field: "ingredients" | "allergens",
    lang: Language,
    value: string
  ) => {
    if (!editing) return;
    setEditing({
      ...editing,
      [field]: {
        ...(editing[field] as any),
        [lang]: value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      },
    } as MenuItem);
  };

  // ─── Image Upload ───────────────────────────────────────────

  const uploadImage = async (file: File) => {
    if (!editing) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${editing.category}/${editing.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("menu-images")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage
        .from("menu-images")
        .getPublicUrl(path);
      updateField("image", publicUrl);
    } catch (e: any) {
      alert("Upload failed: " + e.message);
    }
    setUploading(false);
  };

  // ─── Categories CRUD ────────────────────────────────────────

  const openCatEditor = (cat?: CatType) => {
    setEditingCat(
      cat || { id: `cat_${Date.now()}`, name: "", slug: "", sort_order: categories.length + 1 }
    );
    setShowCatEditor(true);
  };

  const handleSaveCategory = async () => {
    if (!editingCat) return;
    try {
      if (categories.find((c) => c.id === editingCat.id)) {
        await updateCategory(editingCat.id, editingCat);
      } else {
        await createCategory(editingCat);
      }
      await loadCategories();
      setShowCatEditor(false);
      setEditingCat(null);
    } catch (e: any) {
      alert("Save category failed: " + e.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete this category? Items using it will lose their category reference."))
      return;
    try {
      await deleteCategory(id);
      await loadCategories();
    } catch (e: any) {
      alert("Delete failed: " + e.message);
    }
  };

  // ─── Reviews ────────────────────────────────────────────────

  const handleDeleteReview = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    try {
      await deleteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      alert("Delete failed: " + e.message);
    }
  };

  // ─── Sort ───────────────────────────────────────────────────

  const toggleSort = (field: "name" | "price" | "category") => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedFilteredItems = useMemo(() => {
    let f = filter === "all" ? items : items.filter((i) => i.category === filter);
    if (itemSearch) {
      const q = itemSearch.toLowerCase();
      f = f.filter(
        (i) =>
          i.name.en.toLowerCase().includes(q) ||
          i.name.am.toLowerCase().includes(q) ||
          i.name.or.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q)
      );
    }
    return [...f].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.en.localeCompare(b.name.en);
      else if (sortField === "price") cmp = a.price - b.price;
      else if (sortField === "category")
        cmp = a.category.localeCompare(b.category);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [items, filter, itemSearch, sortField, sortDir]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin");
  };

  if (!auth) return null;

  return (
    <div className="luxury-bg">
      <header className="sticky top-0 z-40 bg-white border-b border-border-warm shadow-sm">
        <div className="flex items-center justify-between px-4 h-16 max-w-[1000px] mx-auto">
          <button
            onClick={() => router.push("/")}
            className="w-10 h-10 flex items-center justify-center text-muted hover:text-black"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-lg font-bold text-black">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <div className="max-w-[1000px] mx-auto px-4 py-5">
        {/* Save Bar */}
        <div
          className={cn(
            "sticky top-16 z-30 -mx-4 px-4 py-3 border-b transition-all duration-300 flex items-center gap-2",
            hasChanges
              ? "bg-amber-50 border-amber-200"
              : "bg-transparent border-transparent pointer-events-none opacity-0"
          )}
        >
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
          <span className="text-sm text-amber-800 flex-1">
            Unsaved changes
          </span>
          <button
            onClick={undoChanges}
            className="px-3 py-1.5 text-xs font-medium text-black/60 bg-white border border-border-warm rounded-xl hover:bg-cream-dark transition-colors"
          >
            Undo
          </button>
          <button
            onClick={saveAll}
            disabled={saving}
            className="px-5 py-1.5 bg-gold text-white rounded-xl text-xs font-semibold hover:bg-brown-dark transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {saving ? "Saving..." : "Save All"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-white rounded-2xl p-1 border border-border-warm shadow-sm">
          {(["items", "categories", "messages"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMode(tab)}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all",
                mode === tab ? "bg-gold text-white" : "text-muted/60 hover:text-black"
              )}
            >
              {tab === "items" && `Items (${items.length})`}
              {tab === "categories" && `Categories (${categories.length})`}
              {tab === "messages" && `Messages (${reviews.length})`}
            </button>
          ))}
        </div>

        {/* ─── ITEMS TAB ───────────────────────────────────── */}
        {mode === "items" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {[
                { label: "Total Items", value: items.length, color: "text-gold" },
                { label: "Available", value: items.filter((i) => i.is_available).length, color: "text-green-600" },
                { label: "Hidden", value: items.filter((i) => !i.is_available).length, color: "text-red-500" },
                { label: "Best Seller", value: items.filter((i) => i.is_best_seller).length, color: "text-gold" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl p-4 border border-border-warm text-center shadow-sm">
                  <p className={cn("text-xl md:text-2xl font-bold", s.color)}>{s.value}</p>
                  <p className="text-xs text-muted/50 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/40" />
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Search items..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-border-warm rounded-xl text-sm text-black focus:outline-none focus:border-gold/50"
                  />
                </div>
                <div className="flex gap-1">
                  {[
                    "all",
                    ...categories.map((c) => c.slug),
                  ].map((c) => (
                    <button
                      key={c}
                      onClick={() => setFilter(c)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                        filter === c
                          ? "bg-gold text-white"
                          : "bg-white text-muted/60 border border-border-warm"
                      )}
                    >
                      {c === "all" ? "All" : categories.find((x) => x.slug === c)?.name || c}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => openEditor()}
                className="flex items-center gap-1 px-4 py-2 bg-gold text-white rounded-xl text-sm font-semibold hover:bg-brown-dark transition-colors shadow-sm"
              >
                <Plus size={16} /> Add Item
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3 text-xs text-muted/60">
              <span className="font-medium">Sort:</span>
              {(["name", "price", "category"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => toggleSort(f)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors",
                    sortField === f
                      ? "bg-gold/10 text-gold font-semibold"
                      : "hover:text-black"
                  )}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {sortField === f && <ArrowUpDown size={12} />}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {sortedFilteredItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "bg-white rounded-xl p-4 border border-border-warm flex items-center gap-4 hover:shadow-sm transition-shadow",
                    !item.is_available && "opacity-55"
                  )}
                >
                  <div className="w-14 h-14 rounded-xl bg-cream-dark flex-shrink-0 overflow-hidden border border-border-warm">
                    {item.image ? (
                      <img src={item.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted/30">
                        <Image size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-base font-bold text-black truncate">
                        {item.name.en}
                      </h3>
                      {item.is_best_seller && (
                        <Star size={12} className="text-gold fill-gold" />
                      )}
                      {item.is_signature && (
                        <span className="text-[9px] bg-brown-dark text-white px-1.5 py-0.5 rounded font-bold">
                          S
                        </span>
                      )}
                      {item.is_new && (
                        <span className="text-[9px] bg-green-600 text-white px-1.5 py-0.5 rounded font-bold">
                          NEW
                        </span>
                      )}
                      {item.is_spicy && (
                        <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">
                          !
                        </span>
                      )}
                      {item.isFasting && (
                        <span className="text-[9px] bg-yellow-700 text-white px-1.5 py-0.5 rounded font-bold">
                          F
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted/60 mt-0.5">
                      {item.price} ETB &middot; {item.category} &middot; ID: {item.id}
                    </p>
                    {!item.is_available && (
                      <span className="text-xs text-red-500 font-medium">
                        Hidden from menu
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleAvailability(item.id)}
                      className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-xl transition-colors",
                        item.is_available
                          ? "text-green-600 bg-green-50"
                          : "text-muted/50 bg-cream-dark"
                      )}
                    >
                      {item.is_available ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button
                      onClick={() => openEditor(item)}
                      className="w-8 h-8 flex items-center justify-center text-muted/50 bg-cream-dark rounded-xl hover:text-gold transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="w-8 h-8 flex items-center justify-center text-muted/50 bg-cream-dark rounded-xl hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {sortedFilteredItems.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border border-border-warm">
                  <p className="text-base text-muted/50">No items found</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ─── CATEGORIES TAB ──────────────────────────────── */}
        {mode === "categories" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-black">Manage Categories</h2>
              <button
                onClick={() => openCatEditor()}
                className="flex items-center gap-1 px-4 py-2 bg-gold text-white rounded-xl text-sm font-semibold hover:bg-brown-dark transition-colors"
              >
                <Plus size={16} /> Add Category
              </button>
            </div>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-white rounded-xl p-4 border border-border-warm flex items-center gap-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-black">{cat.name}</h3>
                    <p className="text-sm text-muted/60">
                      Slug: {cat.slug} &middot; Order: {cat.sort_order} &middot; ID: {cat.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openCatEditor(cat)}
                      className="w-8 h-8 flex items-center justify-center text-muted/50 bg-cream-dark rounded-xl hover:text-gold transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="w-8 h-8 flex items-center justify-center text-muted/50 bg-cream-dark rounded-xl hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border border-border-warm">
                  <p className="text-base text-muted/50">No categories yet</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ─── MESSAGES TAB ────────────────────────────────── */}
        {mode === "messages" && (
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-border-warm">
                <MessageSquare size={40} className="mx-auto text-muted/30 mb-3" />
                <p className="text-base text-muted/60">No reviews yet</p>
              </div>
            ) : (
              reviews.map((review) => {
                const item = items.find((i) => i.id === review.itemId);
                return (
                  <div key={review.id} className="bg-white rounded-xl p-4 border border-border-warm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold text-black">{review.author}</p>
                        {item && (
                          <p className="text-xs text-gold">
                            {item.name.en}{" "}
                            <span className="text-muted/50">({review.itemId})</span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted/50">{review.date}</span>
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          className="w-7 h-7 flex items-center justify-center text-muted/50 hover:text-red-500 rounded-xl hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 mb-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={12}
                          className={
                            star <= review.rating ? "text-gold" : "text-border-warm"
                          }
                          fill={star <= review.rating ? "#C08010" : "transparent"}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-black/60 leading-relaxed">
                      {review.comment}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ─── ITEM EDITOR MODAL ──────────────────────────────── */}
      <AnimatePresence>
        {showEditor && editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm overflow-y-auto"
            onClick={() => setShowEditor(false)}
          >
            <div
              className="min-h-full flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full max-w-[600px] bg-white rounded-t-3xl sm:rounded-3xl max-h-[90dvh] overflow-y-auto shadow-2xl">
                <div className="sticky top-0 z-10 bg-white pt-3 pb-2 px-5 border-b border-border-warm flex items-center justify-between">
                  <h2 className="text-lg font-bold text-black">
                    {editing.id.startsWith("item_") ? "Add New Item" : "Edit Item"}
                  </h2>
                  <button
                    onClick={() => setShowEditor(false)}
                    className="w-8 h-8 flex items-center justify-center text-muted/50 bg-cream-dark rounded-full"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted/50 uppercase tracking-wider block mb-1">
                        Category
                      </label>
                      <select
                        value={editing.category}
                        onChange={(e) => updateField("category", e.target.value)}
                        className="w-full px-3 py-2.5 bg-cream-dark rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-gold/50"
                      >
                        {categories.map((cat) => (
                          <option key={cat.slug} value={cat.slug}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted/50 uppercase tracking-wider block mb-1">
                        Item ID
                      </label>
                      <input
                        type="text"
                        value={editing.id}
                        onChange={(e) => updateField("id", e.target.value)}
                        className="w-full px-3 py-2.5 bg-cream-dark rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-gold/50"
                      />
                    </div>
                  </div>

                  {LANGUAGES.map((lang) => (
                    <div
                      key={lang}
                      className="space-y-3 p-3 bg-cream-dark/30 rounded-xl border border-border-warm/50"
                    >
                      <p className="text-xs font-bold text-black uppercase">
                        {lang === "en"
                          ? "English"
                          : lang === "am"
                          ? "አማርኛ"
                          : "Afaan Oromoo"}
                      </p>
                      <div>
                        <label className="text-[10px] font-medium text-muted/50 uppercase tracking-wider block mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          value={(editing.name as any)[lang] || ""}
                          onChange={(e) =>
                            updateTranslatedField("name", lang, e.target.value)
                          }
                          className="w-full px-3 py-2.5 bg-white rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-gold/50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-muted/50 uppercase tracking-wider block mb-1">
                          Description
                        </label>
                        <textarea
                          value={(editing.description as any)[lang] || ""}
                          onChange={(e) =>
                            updateTranslatedField("description", lang, e.target.value)
                          }
                          className="w-full px-3 py-2.5 bg-white rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-gold/50 resize-none h-16"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-muted/50 uppercase tracking-wider block mb-1">
                          Ingredients (comma separated)
                        </label>
                        <input
                          type="text"
                          value={((editing.ingredients as any)[lang] || []).join(", ")}
                          onChange={(e) => updateArrayField("ingredients", lang, e.target.value)}
                          className="w-full px-3 py-2.5 bg-white rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-gold/50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-muted/50 uppercase tracking-wider block mb-1">
                          Allergens (comma separated)
                        </label>
                        <input
                          type="text"
                          value={((editing.allergens as any)[lang] || []).join(", ")}
                          onChange={(e) => updateArrayField("allergens", lang, e.target.value)}
                          className="w-full px-3 py-2.5 bg-white rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-gold/50"
                        />
                      </div>
                    </div>
                  ))}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted/50 uppercase tracking-wider block mb-1">
                        Price (ETB)
                      </label>
                      <input
                        type="number"
                        value={editing.price}
                        onChange={(e) => updateField("price", Number(e.target.value))}
                        className="w-full px-3 py-2.5 bg-cream-dark rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-gold/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted/50 uppercase tracking-wider block mb-1">
                        Calories
                      </label>
                      <input
                        type="number"
                        value={editing.calories}
                        onChange={(e) => updateField("calories", Number(e.target.value))}
                        className="w-full px-3 py-2.5 bg-cream-dark rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-gold/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted/50 uppercase tracking-wider block mb-1">
                        Prep (min)
                      </label>
                      <input
                        type="text"
                        value={editing.prep_time}
                        onChange={(e) => updateField("prep_time", e.target.value)}
                        className="w-full px-3 py-2.5 bg-cream-dark rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-gold/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted/50 uppercase tracking-wider block mb-1">
                        Rating
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={editing.rating}
                        onChange={(e) => updateField("rating", Number(e.target.value))}
                        className="w-full px-3 py-2.5 bg-cream-dark rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-gold/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted/50 uppercase tracking-wider block mb-1">
                      Image
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={editing.image || ""}
                        onChange={(e) => updateField("image", e.target.value)}
                        className="flex-1 px-3 py-2.5 bg-cream-dark rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-gold/50"
                        placeholder="Image URL or upload below"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="px-4 py-2.5 bg-gold text-white rounded-xl text-sm font-semibold hover:bg-brown-dark transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <Upload size={16} />
                        {uploading ? "..." : "Upload"}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) uploadImage(e.target.files[0]);
                        }}
                      />
                    </div>
                    {editing.image && (
                      <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden bg-cream-dark border border-border-warm">
                        <img
                          src={editing.image}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted/50 uppercase tracking-wider block mb-2">
                      Badges & Toggles
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: "is_best_seller", label: "Best Seller" },
                        { key: "is_signature", label: "Signature" },
                        { key: "is_new", label: "New" },
                        { key: "is_spicy", label: "Spicy" },
                        { key: "is_available", label: "Available" },
                        { key: "isFasting", label: "Fasting" },
                      ].map((b) => (
                        <button
                          key={b.key}
                          onClick={() =>
                            updateField(b.key, !(editing as any)[b.key])
                          }
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
                            (editing as any)[b.key]
                              ? "bg-gold text-white border-gold"
                              : "bg-cream-dark text-muted/50 border-border-warm"
                          )}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="sticky bottom-0 bg-white border-t border-border-warm p-4">
                  <button
                    onClick={handleSaveItem}
                    disabled={saving}
                    className="w-full py-3 bg-gold text-white rounded-xl font-semibold text-base hover:bg-brown-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <Save size={18} />
                    )}
                    {saving
                      ? "Saving..."
                      : editing.id.startsWith("item_")
                      ? "Create Item"
                      : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── CATEGORY EDITOR MODAL ──────────────────────────── */}
      <AnimatePresence>
        {showCatEditor && editingCat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowCatEditor(false)}
          >
            <div
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-black">
                  {categories.find((c) => c.id === editingCat.id)
                    ? "Edit Category"
                    : "Add Category"}
                </h2>
                <button
                  onClick={() => setShowCatEditor(false)}
                  className="w-8 h-8 flex items-center justify-center text-muted/50 bg-cream-dark rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted/50 uppercase tracking-wider block mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editingCat.name}
                    onChange={(e) =>
                      setEditingCat({ ...editingCat, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                    }
                    className="w-full px-3 py-2.5 bg-cream-dark rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-gold/50"
                    placeholder="Category name"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted/50 uppercase tracking-wider block mb-1">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={editingCat.slug}
                    onChange={(e) =>
                      setEditingCat({ ...editingCat, slug: e.target.value })
                    }
                    className="w-full px-3 py-2.5 bg-cream-dark rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-gold/50"
                    placeholder="category-slug"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted/50 uppercase tracking-wider block mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={editingCat.sort_order}
                    onChange={(e) =>
                      setEditingCat({
                        ...editingCat,
                        sort_order: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2.5 bg-cream-dark rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                </div>
                <button
                  onClick={handleSaveCategory}
                  className="w-full py-3 bg-gold text-white rounded-xl font-semibold text-sm hover:bg-brown-dark transition-colors"
                >
                  Save Category
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-8" />
    </div>
  );
}
