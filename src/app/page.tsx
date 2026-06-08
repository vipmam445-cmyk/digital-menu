"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { useCart, CartItem } from "@/context/CartContext";
import { MenuItem } from "@/data/menuData";
import { Language } from "@/data/translations";
import { cn } from "@/lib/utils";
import {
  Search, X, Menu, Globe, ChevronDown, Star, ShoppingCart, Plus, Minus, Trash2, Shield,
} from "lucide-react";
import { getAllMenuItems, getAllReviews, subscribeToMenuItems } from "@/lib/db/database";

const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "am", label: "አማርኛ" },
  { code: "or", label: "Afaan Oromoo" },
  { code: "zh", label: "中文" },
];

const CATEGORIES = [
  { id: "all", labelKey: "menu" as const },
  { id: "fastfood", labelKey: "burgerPizza" as const },
  { id: "breakfast", labelKey: "breakfast" as const },
  { id: "lunch", labelKey: "lunch" as const },
  { id: "drinks", labelKey: "drinks" as const },
];

const DRINK_SUBCATS = [
  { id: "hot", labelKey: "hotDrinks" as const },
  { id: "cold", labelKey: "coldDrinks" as const },
  { id: "alcoholic", labelKey: "alcoholic" as const },
];

const FASTING_OPTIONS = [
  { id: "all", labelKey: "all" as const },
  { id: "nonFasting", labelKey: "nonFasting" as const },
  { id: "fasting", labelKey: "fasting" as const },
];

interface Review {
  id: string;
  itemId: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

export default function Home() {
  const { language, setLanguage, t } = useLanguage();
  const cart = useCart();
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [category, setCategory] = useState("all");
  const [drinkSub, setDrinkSub] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fastingFilter, setFastingFilter] = useState("all");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [drinkDropdownOpen, setDrinkDropdownOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewForm, setReviewForm] = useState({ author: "", rating: 5, comment: "" });
  const searchRef = useRef<HTMLInputElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const drinkDropdownRef = useRef<HTMLDivElement>(null);

  const [showCart, setShowCart] = useState(false);

  // Load data from Supabase + real-time subscription
  useEffect(() => {
    async function load() {
      try {
        const [menuData, reviewData] = await Promise.all([
          getAllMenuItems(),
          getAllReviews(),
        ]);
        setItems(menuData);
        setReviews(reviewData);
      } catch (e) {
        console.error("Failed to load from Supabase", e);
      }
      setLoading(false);
    }
    load();

    // Real-time: menu items update automatically
    const channel = subscribeToMenuItems(async () => {
      try {
        const fresh = await getAllMenuItems();
        setItems(fresh);
      } catch {}
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (showSearch && searchRef.current) searchRef.current.focus();
  }, [showSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (drinkDropdownRef.current && !drinkDropdownRef.current.contains(e.target as Node)) {
        setDrinkDropdownOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!item.is_available) return false;
      if (fastingFilter === "fasting" && !item.isFasting) return false;
      if (fastingFilter === "nonFasting" && item.isFasting) return false;
      if (category === "all") return true;
      if (category === "fastfood") {
        const n = item.name.en.toLowerCase();
        return n.includes("burger") || n.includes("pizza");
      }
      if (category === "drinks") {
        if (item.category !== "drinks") return false;
        if (drinkSub !== "all" && item.subcategory !== drinkSub) return false;
        return true;
      }
      return item.category === category;
    }).filter((item) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (item.name[language] ?? item.name.en).toLowerCase().includes(q) ||
        (item.description[language] ?? item.description.en).toLowerCase().includes(q)
      );
    });
  }, [category, drinkSub, fastingFilter, searchQuery, language, items]);

  const cartItemCount = cart.totalItems;

  // Preload first few images for LCP
  useEffect(() => {
    if (items.length === 0) return;
    items.slice(0, 8).forEach((i) => {
      if (i.image && !i.image.startsWith("http")) {
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "image";
        link.href = i.image;
        document.head.appendChild(link);
      }
    });
  }, [items]);

  if (loading) {
    return (
      <div className="luxury-bg flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted text-sm">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="luxury-bg">
      <div className="app-container">
        <div className="tibeb-corner tibeb-corner-tl" />
        <div className="tibeb-corner tibeb-corner-tr" />
        <div className="tibeb-corner tibeb-corner-bl" />
        <div className="tibeb-corner tibeb-corner-br" />

        {/* HEADER */}
        <header className="relative pt-12 pb-8 text-center border-b border-border-warm">
          <div className="absolute top-4 left-5 flex items-center gap-1.5">
            <div className="w-6 h-px bg-gradient-to-r from-transparent to-gold/40" />
            <div className="gold-diamond" />
          </div>
          <div className="absolute top-4 right-5 flex items-center gap-1.5">
            <div className="gold-diamond" />
            <div className="w-6 h-px bg-gradient-to-l from-transparent to-gold/40" />
          </div>

          <div className="absolute top-4 right-14 flex items-center gap-2">
            <button onClick={() => setShowSearch(!showSearch)} className="w-10 h-10 flex items-center justify-center text-muted hover:text-gold transition-colors">
              <Search size={18} />
            </button>
            <button onClick={() => setShowLangPicker(true)} className="w-10 h-10 flex items-center justify-center text-gold">
              <Globe size={18} />
            </button>
          </div>
          <button onClick={() => setShowSidebar(true)} className="absolute top-4 left-14 w-10 h-10 flex items-center justify-center text-muted hover:text-gold transition-colors">
            <Menu size={20} />
          </button>

          <div>
            <div className="gold-flourish mb-4">
              <div className="gold-diamond" />
            </div>
            <img src="/images/logop.png" alt="Paramount Cafe &amp; Pizzeria" className="h-20 md:h-24 mx-auto mb-3 object-contain" loading="eager" />
            <h1 className="text-2xl md:text-3xl font-logo text-black">{t.welcome} to</h1>
            <p className="text-2xl md:text-3xl font-logo text-gold mt-1">Paramount Cafe &amp; Pizzeria</p>
            <p className="text-xs md:text-sm font-heading text-muted tracking-[0.3em] uppercase mt-2">{t.tagline}</p>
            <div className="tibeb-divider mt-5">
              <div className="tibeb-cross">
                <div className="tibeb-cross-inner" />
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showSearch && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-5 px-5">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/40" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.search}
                    className="w-full pl-10 pr-10 py-3 bg-cream-dark rounded-xl text-base text-black placeholder-muted/40 border border-border-warm focus:outline-none focus:border-gold/50 transition-colors"
                  />
                  {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted/40"><X size={16} /></button>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* CATEGORY & FASTING FILTERS */}
        <div className="sticky top-0 z-20 border-b border-border-warm bg-white/95 backdrop-blur-sm">
          <div className="px-5 py-3 relative" ref={categoryDropdownRef}>
            <button
              onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
              className="flex items-center gap-2 w-full border border-border-warm bg-cream rounded-xl px-4 py-3 text-base text-black font-heading tracking-wider uppercase"
            >
              <span className="flex-1 text-left">{t[CATEGORIES.find(c => c.id === category)!.labelKey]}</span>
              <ChevronDown size={16} className={`text-gold transition-transform ${categoryDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {categoryDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-border-warm rounded-xl shadow-xl z-30 py-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => { setCategory(cat.id); setDrinkSub("all"); setCategoryDropdownOpen(false); }}
                    className={cn(
                      "w-full text-left px-5 py-3 text-sm font-heading tracking-wider uppercase transition-colors",
                      category === cat.id ? "text-gold font-semibold bg-gold/5" : "text-black/60 hover:text-black hover:bg-cream-dark"
                    )}
                  >
                    {t[cat.labelKey]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {category === "drinks" && (
            <div className="px-5 pb-3">
              <div className="relative" ref={drinkDropdownRef}>
                <button
                  onClick={() => setDrinkDropdownOpen(!drinkDropdownOpen)}
                  className="flex items-center gap-1.5 text-xs font-heading tracking-wider uppercase text-gold font-semibold"
                >
                  {drinkSub === "all" ? t.all : t[DRINK_SUBCATS.find(s => s.id === drinkSub)!.labelKey]}
                  <ChevronDown size={12} className={`transition-transform ${drinkDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {drinkDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-40 bg-white border border-border-warm rounded-xl shadow-xl z-30 py-1">
                    <button
                      onClick={() => { setDrinkSub("all"); setDrinkDropdownOpen(false); }}
                      className={cn("w-full text-left px-4 py-2.5 text-xs tracking-wider uppercase transition-colors", drinkSub === "all" ? "text-gold" : "text-black/60 hover:text-black hover:bg-cream-dark")}
                    >
                      {t.all}
                    </button>
                    {DRINK_SUBCATS.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => { setDrinkSub(sub.id); setDrinkDropdownOpen(false); }}
                        className={cn("w-full text-left px-4 py-2.5 text-xs tracking-wider uppercase transition-colors", drinkSub === sub.id ? "text-gold" : "text-black/60 hover:text-black hover:bg-cream-dark")}
                      >
                        {t[sub.labelKey]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="px-5 pb-4 flex gap-2 flex-wrap">
            {FASTING_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setFastingFilter(opt.id)}
                className={cn("px-4 py-2 rounded-full text-xs font-heading tracking-wider uppercase transition-all", fastingFilter === opt.id ? "bg-gold text-white" : "bg-white text-black/60 border border-border-warm hover:text-black")}
              >
                {t[opt.labelKey]}
              </button>
            ))}
          </div>
        </div>

        {/* SEARCH RESULTS OVERLAY */}
        {searchQuery && (
          <div className="px-5 py-5 space-y-2 bg-cream-dark/40 min-h-[50dvh]">
            <p className="text-xs font-heading text-muted/50 uppercase tracking-[0.2em] mb-4">{t.searchResults}</p>
            {items.filter((it) => it.is_available && ((it.name[language] ?? it.name.en).toLowerCase().includes(searchQuery.toLowerCase()) || (it.description[language] ?? it.description.en).toLowerCase().includes(searchQuery.toLowerCase()))).map((it) => (
              <button key={it.id} onClick={() => setSelectedItem(it)} className="w-full text-left py-3 px-4 rounded-xl bg-white/80 hover:bg-white transition-colors flex items-center gap-3 border border-border-warm/40">
                <span className="text-base text-black flex-1 truncate">{(it.name[language] ?? it.name.en)}</span>
                <span className="text-sm text-gold font-semibold">{it.price}</span>
              </button>
            ))}
            {items.filter((it) => it.is_available && ((it.name[language] ?? it.name.en).toLowerCase().includes(searchQuery.toLowerCase()) || (it.description[language] ?? it.description.en).toLowerCase().includes(searchQuery.toLowerCase()))).length === 0 && (
              <p className="text-base text-muted/50 text-center py-8">{t.noResults}</p>
            )}
          </div>
        )}

        {/* MENU ITEMS */}
        {!searchQuery && (
          <div className="px-5 pb-24 pt-6">
            <div className="space-y-0">
              {filteredItems.map((item, idx) => (
                <React.Fragment key={item.id}>
                  {idx > 0 && (
                    <div className="menu-divider py-2">
                      <div className="gold-diamond" />
                    </div>
                  )}
                  <MenuItemRow item={item} language={language} t={t} reviews={reviews} onClick={() => setSelectedItem(item)} delay={idx} onAddToCart={() => cart.addItem(item)} />
                </React.Fragment>
              ))}
              {filteredItems.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-base text-muted/50">{t.noItems}</p>
                </div>
              )}
            </div>
            <div className="mt-12 text-center">
              <div className="tibeb-divider">
                <div className="tibeb-cross">
                  <div className="tibeb-cross-inner" />
                </div>
              </div>
              <p className="text-[10px] text-muted/40 tracking-[0.2em] uppercase mt-3 font-heading">{t.designedBy}</p>
            </div>
          </div>
        )}

        {/* SIDEBAR */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowSidebar(false)}>
              <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: "spring", damping: 28, stiffness: 300 }} className="absolute top-0 left-0 bottom-0 w-[300px] max-w-[80vw] wood-sidebar border-r border-white/5 shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-8">
                  <div className="flex items-start justify-between mb-1">
                    <img src="/images/logop.png" alt="Paramount Cafe &amp; Pizzeria" className="h-12 md:h-14 object-contain" loading="eager" />
                    <button onClick={() => setShowSidebar(false)} className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white transition-colors shrink-0"><X size={20} /></button>
                  </div>
                  <h2 className="text-lg font-logo text-white">{t.welcome} to</h2>
                  <p className="text-xl font-logo text-gold mt-0.5 mb-4">Paramount Cafe &amp; Pizzeria</p>
                  <p className="text-xs font-heading text-white/50 mb-7 leading-relaxed tracking-[0.15em] uppercase">{t.subtitle}</p>
                  <div className="space-y-1">
                    {CATEGORIES.map((cat) => (
                      <button key={cat.id} onClick={() => { setCategory(cat.id); setShowSidebar(false); }} className={cn("w-full text-left py-3.5 px-4 rounded-xl text-sm font-heading transition-all tracking-wider uppercase", category === cat.id ? "bg-gold/20 text-gold font-semibold" : "text-white/60 hover:text-white hover:bg-white/5")}>
                        {t[cat.labelKey]}
                      </button>
                    ))}
                  </div>
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <p className="text-xs text-white/50 mb-3 uppercase tracking-wider">{t.diet}</p>
                    <div className="flex flex-wrap gap-2">
                      {FASTING_OPTIONS.map((opt) => (
                        <button key={opt.id} onClick={() => { setFastingFilter(opt.id); setShowSidebar(false); }} className={cn("px-3 py-1.5 rounded-full text-xs font-heading tracking-wider uppercase transition-all", fastingFilter === opt.id ? "bg-gold/20 text-gold" : "text-white/50 hover:text-white border border-white/10 hover:border-white/20")}>
                          {t[opt.labelKey]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-8 pt-7 border-t border-white/10">
                    <p className="text-xs text-white/50 mb-3 uppercase tracking-wider">{t.language}</p>
                    <div className="space-y-1.5">
                      {LANGUAGES.map((lang) => (
                        <button key={lang.code} onClick={() => { setLanguage(lang.code); setShowSidebar(false); }} className={cn("w-full text-left py-2.5 px-4 rounded-xl text-sm transition-colors", language === lang.code ? "bg-gold/20 text-gold font-medium" : "text-white/60 hover:text-white hover:bg-white/5")}>
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => window.location.href = "/admin"} className="mt-6 w-full py-3 px-4 rounded-xl text-xs text-white/30 hover:text-gold hover:bg-white/5 transition-all tracking-wider uppercase border border-white/10">
                    {t.admin}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LANGUAGE PICKER */}
        <AnimatePresence>
          {showLangPicker && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowLangPicker(false)}>
              <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: "spring", damping: 28, stiffness: 300 }} className="absolute bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white rounded-t-2xl p-6 border-t border-border-warm" onClick={(e) => e.stopPropagation()}>
                <div className="w-8 h-0.5 bg-gold/30 rounded-full mx-auto mb-6" />
                <h3 className="text-lg font-medium text-black text-center mb-5">{t.language}</h3>
                {LANGUAGES.map((lang) => (
                  <button key={lang.code} onClick={() => { setLanguage(lang.code); setShowLangPicker(false); }} className={cn("w-full py-3.5 px-4 rounded-xl text-left text-base mb-1.5 transition-colors", language === lang.code ? "bg-gold/15 text-gold font-medium" : "bg-cream-dark text-black/70 hover:bg-cream-dark/80")}>
                    {lang.label}
                  </button>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== ITEM DETAIL MODAL ===== */}
        <AnimatePresence>
          {selectedItem && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }} className="absolute bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white rounded-t-2xl max-h-[90dvh] overflow-y-auto border-t border-gold/30" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 z-10 py-3 px-5 flex items-center justify-between bg-white border-b border-border-warm">
                  <div className="w-8 h-0.5 bg-gold/30 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2.5" />
                  <button onClick={() => setSelectedItem(null)} className="ml-auto w-8 h-8 flex items-center justify-center text-muted/50 hover:text-black bg-cream-dark rounded-full transition-colors"><X size={18} /></button>
                </div>
                <div className="relative h-80 bg-cream-dark mx-5 mt-4 rounded-xl overflow-hidden border border-border-warm">
                  <img src={selectedItem.image} alt={(selectedItem.name[language] ?? selectedItem.name.en)} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                </div>
                <div className="p-5">
                  <h2 className="text-2xl font-item text-black font-semibold tracking-wide">{(selectedItem.name[language] ?? selectedItem.name.en)}</h2>
                  <p className="text-base text-black/70 leading-relaxed mt-3">{(selectedItem.description[language] ?? selectedItem.description.en)}</p>
                  <div className="mt-6 pt-4 border-t border-border-warm">
                    <span className="text-xl font-price text-gold font-semibold">{selectedItem.price} <span className="text-sm font-normal text-muted/50">{t.birr}</span></span>
                  </div>
                  <div className="mt-6">
                    <h4 className="text-xs font-heading text-gold uppercase tracking-[0.15em] mb-3 font-semibold">{t.ingredients}</h4>
                    <div className="flex flex-wrap gap-2">
                      {(selectedItem.ingredients[language] ?? selectedItem.ingredients.en).map((ing, idx) => (
                        <span key={idx} className="text-sm text-black/70 bg-cream-dark px-3 py-1.5 rounded-full border border-border-warm">{ing}</span>
                      ))}
                    </div>
                  </div>
                  {(selectedItem.allergens[language] ?? selectedItem.allergens.en).filter((a) => a.toLowerCase() !== "none").length > 0 && (
                    <div className="mt-5">
                      <h4 className="text-xs font-heading text-gold uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5 font-semibold">
                        <Shield size={14} /> {t.allergens}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {(selectedItem.allergens[language] ?? selectedItem.allergens.en).filter((a) => a.toLowerCase() !== "none").map((a, idx) => (
                          <span key={idx} className="text-sm text-[#C0392B] bg-red-50/80 px-3 py-1.5 rounded-full border border-red-200">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={() => { cart.addItem(selectedItem); setSelectedItem(null); }} className="mt-6 w-full py-3.5 bg-gold text-white rounded-xl font-semibold text-base hover:bg-brown-dark transition-colors flex items-center justify-center gap-2">
                    <Plus size={18} /> Add to Cart — {selectedItem.price} {t.birr}
                  </button>

                  {/* REVIEWS */}
                  <div className="mt-6 pt-5 border-t border-border-warm">
                    <h4 className="text-xs font-heading text-gold uppercase tracking-[0.15em] mb-3 font-semibold">{t.reviews}</h4>
                    {reviews.filter(r => r.itemId === selectedItem.id).length > 0 ? (
                      <div className="space-y-3 mb-4">
                        {reviews.filter(r => r.itemId === selectedItem.id).map((review) => (
                          <div key={review.id} className="bg-cream-dark/50 rounded-xl px-4 py-3 border border-border-warm/60">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-black font-medium">{review.author}</span>
                              <span className="text-[10px] text-muted/40">{review.date}</span>
                            </div>
                            <div className="flex items-center gap-0.5 mb-1.5">
                              {[1,2,3,4,5].map((star) => (
                                <Star key={star} size={12} className={star <= review.rating ? "text-gold" : "text-border-warm"} fill={star <= review.rating ? "#C08010" : "transparent"} />
                              ))}
                            </div>
                            <p className="text-sm text-black/60 leading-relaxed">{review.comment}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted/40 mb-4">{t.noReviews}</p>
                    )}
                    <div className="bg-cream-dark/50 rounded-xl p-4 border border-border-warm/60">
                      <p className="text-xs text-gold/80 uppercase tracking-wider mb-3 font-medium">{t.writeReview}</p>
                      <input type="text" placeholder={t.yourName} value={reviewForm.author} onChange={(e) => setReviewForm({ ...reviewForm, author: e.target.value })} className="w-full bg-white rounded-xl px-3 py-2.5 text-sm text-black placeholder-muted/40 border border-border-warm focus:outline-none focus:border-gold/50 transition-colors mb-2" />
                      <div className="flex items-center gap-1 mb-2">
                        <span className="text-xs text-muted/60 mr-1">Rating:</span>
                        {[1,2,3,4,5].map((star) => (
                          <button key={star} onClick={() => setReviewForm({ ...reviewForm, rating: star })}>
                            <Star size={16} className={star <= reviewForm.rating ? "text-gold" : "text-border-warm"} fill={star <= reviewForm.rating ? "#C08010" : "transparent"} />
                          </button>
                        ))}
                      </div>
                      <textarea placeholder={t.shareThoughts} value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} rows={2} className="w-full bg-white rounded-xl px-3 py-2.5 text-sm text-black placeholder-muted/40 border border-border-warm focus:outline-none focus:border-gold/50 transition-colors resize-none mb-2" />
                      <button
                        onClick={async () => {
                          if (!reviewForm.author.trim() || !reviewForm.comment.trim()) return;
                          const newReview: Review = { id: Date.now().toString(), itemId: selectedItem.id, author: reviewForm.author.trim(), rating: reviewForm.rating, comment: reviewForm.comment.trim(), date: new Date().toLocaleDateString() };
                          const updated = [...reviews, newReview];
                          setReviews(updated);
                          try {
                            const { addReview } = await import("@/lib/db/database");
                            await addReview(newReview);
                          } catch {}
                          setReviewForm({ author: "", rating: 5, comment: "" });
                        }}
                        className="w-full py-2.5 text-xs tracking-wider uppercase bg-gold/15 hover:bg-gold/25 text-gold font-semibold rounded-xl transition-colors border border-gold/20"
                      >
                        {t.submitReview}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== STICKY CART BUTTON ===== */}
        {cartItemCount > 0 && (
          <div className="sticky bottom-0 z-30 px-4 pb-3 pt-1">
            <button
              onClick={() => setShowCart(true)}
              className="w-full relative bg-black text-white rounded-xl py-4 px-4 shadow-xl flex items-center justify-between hover:bg-dark transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                  <ShoppingCart size={18} className="text-gold" />
                </div>
                <div className="text-left">
                  <div className="text-base font-semibold tracking-wide">{cartItemCount} {cartItemCount === 1 ? "item" : "items"}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gold">{cart.totalPrice.toLocaleString()} <span className="text-sm font-normal text-white/70">ETB</span></div>
              </div>
            </button>
          </div>
        )}

        {/* ===== CART MODAL ===== */}
        <AnimatePresence>
          {showCart && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setShowCart(false)}>
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="absolute bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white rounded-t-2xl max-h-[80dvh] overflow-y-auto border-t border-gold/30"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 z-10 bg-white pt-3 pb-2 px-5 border-b border-border-warm flex items-center justify-between">
                  <div className="w-8 h-0.5 bg-gold/30 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2.5" />
                  <h2 className="text-lg font-bold text-black">Your Order</h2>
                  <button onClick={() => setShowCart(false)} className="w-8 h-8 flex items-center justify-center text-muted/50 hover:text-black bg-cream-dark rounded-full transition-colors"><X size={18} /></button>
                </div>

                <div className="p-5">
                  {cart.items.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingCart size={48} className="mx-auto text-muted/30 mb-3" />
                      <p className="text-base text-muted/50">Your cart is empty</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3 mb-6">
                        {cart.items.map((ci) => (
                          <div key={ci.item.id} className="bg-cream-dark/50 rounded-xl p-3 border border-border-warm/60">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden bg-cream-dark flex-shrink-0 border border-border-warm/40">
                                <img src={ci.item.image} alt={(ci.item.name[language] ?? ci.item.name.en)} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm md:text-base font-medium text-black truncate">{(ci.item.name[language] ?? ci.item.name.en)}</p>
                                <p className="text-xs md:text-sm text-muted/50">{ci.item.price} ETB each</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm md:text-base font-bold text-black">{(ci.item.price * ci.quantity).toLocaleString()}</p>
                                <p className="text-[9px] text-muted/40">ETB</p>
                              </div>
                              <button onClick={() => cart.removeItem(ci.item.id)} className="w-7 h-7 flex items-center justify-center text-muted/30 hover:text-[#C0392B] transition-colors flex-shrink-0">
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="flex items-center justify-end gap-2 mt-2.5 pt-2 border-t border-border-warm/30">
                              <span className="text-[10px] text-muted/40 uppercase tracking-wider mr-auto">Qty</span>
                              <button onClick={() => cart.updateQuantity(ci.item.id, ci.quantity - 1)} className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white border border-border-warm flex items-center justify-center text-black/60 hover:text-black transition-colors">
                                <Minus size={12} />
                              </button>
                              <span className="w-7 md:w-8 text-center text-sm md:text-base font-semibold text-black">{ci.quantity}</span>
                              <button onClick={() => cart.updateQuantity(ci.item.id, ci.quantity + 1)} className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white border border-border-warm flex items-center justify-center text-black/60 hover:text-black transition-colors">
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-border-warm pt-4 mb-5">
                        <div className="flex items-center justify-between text-lg">
                          <span className="font-bold text-black">TOTAL AMOUNT</span>
                          <span className="font-bold text-gold text-xl">{cart.totalPrice.toLocaleString()} ETB</span>
                        </div>
                      </div>

                      <button onClick={() => setShowCart(false)} className="w-full py-3.5 text-base font-medium text-white bg-gold rounded-xl hover:bg-brown-dark transition-colors">
                        Continue Browsing
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MenuItemRow({ item, language, t, reviews, onClick, delay, onAddToCart }: {
  item: MenuItem;
  language: Language;
  t: any;
  reviews: Review[];
  onClick: () => void;
  delay: number;
  onAddToCart: () => void;
}) {
  const itemReviews = reviews.filter(r => r.itemId === item.id);
  const avgRating = itemReviews.length > 0 ? Math.round(itemReviews.reduce((s, r) => s + r.rating, 0) / itemReviews.length * 10) / 10 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.02 }}
      className="flex items-stretch gap-0"
    >
      <button
        onClick={onClick}
        className={cn(
          "text-left group card-accent flex-1",
          "rounded-l-xl px-4 py-3 transition-all duration-200"
        )}
      >
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-lg md:text-xl font-item text-black font-semibold leading-tight group-hover:text-gold transition-colors tracking-wide">{(item.name[language] ?? item.name.en)}</h3>
              <span className="text-base md:text-lg font-price text-gold font-semibold flex-shrink-0">{item.price} <span className="text-xs font-normal text-muted/50">{t.birr}</span></span>
            </div>
            {item.isFasting && (
              <span className="inline-block text-[10px] font-heading text-muted/50 tracking-wider uppercase mt-0.5">{t.fasting}</span>
            )}
            <p className="text-sm md:text-base text-black/70 mt-1 leading-relaxed line-clamp-2">{(item.description[language] ?? item.description.en)}</p>
            {itemReviews.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="flex items-center gap-[1px]">
                  {[1,2,3,4,5].map((star) => (
                    <Star key={star} size={10} className={star <= Math.round(avgRating) ? "text-gold" : "text-border-warm"} fill={star <= Math.round(avgRating) ? "#C08010" : "transparent"} />
                  ))}
                </div>
                <span className="text-[10px] text-muted/40">({itemReviews.length})</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-cream-dark border border-border-warm/60 opacity-80 group-hover:opacity-100 transition-all duration-300 group-hover:border-gold/30 group-hover:shadow-[0_0_12px_rgba(192,128,16,0.1)] relative">
              <img src={item.image} alt={(item.name[language] ?? item.name.en)} className="w-full h-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onAddToCart(); }}
        className="w-12 flex-shrink-0 bg-gold/10 hover:bg-gold/20 border-l border-gold/20 rounded-r-xl flex flex-col items-center justify-center gap-0.5 transition-colors group"
        title="Add to cart"
      >
        <Plus size={18} className="text-gold" />
        <span className="text-[8px] font-heading text-gold tracking-wider uppercase">Add</span>
      </button>
    </motion.div>
  );
}
