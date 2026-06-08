"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { MenuItem } from "@/data/menuData";
import { Language } from "@/data/translations";
import { cn } from "@/lib/utils";
import {
  Search, X, Clock, Flame, Snowflake, Shield,
  ChevronLeft, Star, Globe, UtensilsCrossed, ShoppingCart, Plus
} from "lucide-react";
import Link from "next/link";

interface MenuViewProps {
  items: MenuItem[];
  categories: { id: string; label: string; icon?: React.ReactNode }[];
  title: string;
  subtitle: string;
  accentColor?: string;
}

const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "am", label: "አማ" },
  { code: "or", label: "OR" },
  { code: "zh", label: "中文" },
];

export const MenuView: React.FC<MenuViewProps> = ({
  items,
  categories,
  title,
  subtitle,
  accentColor = "#C08010",
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showSearch && searchRef.current) searchRef.current.focus();
  }, [showSearch]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!item.is_available) return false;
      const catMatch = activeCategory === "all" || item.category === activeCategory;
      if (!catMatch) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (item.name[language] ?? item.name.en).toLowerCase().includes(q) ||
        (item.description[language] ?? item.description.en).toLowerCase().includes(q) ||
        (item.ingredients[language] ?? item.ingredients.en).some((i) => i.toLowerCase().includes(q))
      );
    });
  }, [activeCategory, searchQuery, language, items]);

  const handleCategoryClick = (catId: string) => {
    setActiveCategory(catId);
    const el = document.getElementById(`cat-${catId}`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const getBadges = (item: MenuItem) => {
    const b: { label: string; cls: string }[] = [];
    if (item.is_best_seller) b.push({ label: t.bestSeller, cls: "bg-gold text-white" });
    if (item.is_signature) b.push({ label: t.signature, cls: "bg-brown-dark text-white" });
    if (item.is_new) b.push({ label: t.newItem, cls: "bg-warm-brown text-white" });
    if (item.is_spicy) b.push({ label: t.spicy, cls: "bg-[#C0392B] text-white" });
    return b;
  };

  return (
    <div className="app-container">
      {/* ADMIN BUTTON (hidden) */}
      <button onClick={() => window.location.href = "/admin"} className="fixed top-2 left-2 z-50 w-6 h-6 opacity-0 hover:opacity-100">
        <span className="sr-only">Admin</span>
      </button>

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur-lg border-b border-border-warm">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/logop.png" alt="Elshaday" className="h-8 w-auto object-contain" />
            <span className="text-[15px] font-bold text-gold tracking-tight hidden sm:inline">{title}</span>
          </Link>
          <div className="flex flex-col items-center absolute left-1/2 -translate-x-1/2">
            <p className="text-[9px] text-muted/60 tracking-wider uppercase">{subtitle}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowSearch(!showSearch)} className="w-10 h-10 flex items-center justify-center text-muted/70 hover:text-black">
              <Search size={20} />
            </button>
            <button onClick={() => setShowLangPicker(true)} className="w-10 h-10 flex items-center justify-center text-gold">
              <Globe size={20} />
            </button>
          </div>
        </div>
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden px-4 pb-3"
            >
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/50" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.search}
                  className="w-full pl-9 pr-8 py-2.5 bg-white rounded-xl text-sm text-black placeholder-muted/40 border border-border-warm focus:outline-none focus:border-gold/50 transition-colors"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted/50">
                    <X size={16} />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* LANGUAGE PICKER */}
      <AnimatePresence>
        {showLangPicker && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowLangPicker(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white rounded-t-3xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-border-warm rounded-full mx-auto mb-6" />
              <h3 className="text-lg font-bold text-black text-center mb-6">{t.language}</h3>
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => { setLanguage(lang.code); setShowLangPicker(false); }}
                  className={cn(
                    "w-full py-4 px-4 rounded-2xl text-left mb-2 transition-all",
                    language === lang.code
                      ? "bg-gold text-white font-semibold"
                      : "bg-cream-dark text-muted hover:bg-border-warm"
                  )}
                >
                  {lang.label}
                </button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CATEGORY TABS */}
      <div className="sticky top-14 z-30 bg-cream/95 backdrop-blur-lg border-b border-border-warm">
        <div ref={categoryRef} className="flex overflow-x-auto hide-scrollbar px-4 py-2 gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              id={`cat-${cat.id}`}
              onClick={() => handleCategoryClick(cat.id)}
              className={cn(
                "flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5",
                activeCategory === cat.id
                  ? "bg-gold text-white shadow-lg shadow-gold/20"
                  : "bg-white text-muted hover:text-black border border-border-warm"
              )}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* MENU ITEMS */}
      <main className="px-4 py-4 pb-24 space-y-3">
        {filteredItems.length === 0 && (
          <div className="text-center py-16">
            <Search size={40} className="mx-auto text-border-warm mb-4" />
            <p className="text-muted/60 text-sm">{t.noItems}</p>
            <button onClick={() => setSearchQuery("")} className="mt-3 text-gold text-sm font-medium">{t.clearSearch}</button>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {filteredItems.map((item, index) => {
            const badges = getBadges(item);
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
                onClick={() => setSelectedItem(item)}
                className="bg-white rounded-[18px] overflow-hidden card-accent active:scale-[0.98] transition-all duration-200 cursor-pointer"
              >
                <div className="flex">
                  <div className="relative w-[130px] h-[130px] flex-shrink-0 bg-cream-dark overflow-hidden">
                    <img
                      src={item.image}
                      alt={(item.name[language] ?? item.name.en)}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                    {badges.length > 0 && (
                      <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5">
                        {badges.slice(0, 2).map((b) => (
                          <span key={b.label} className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded-sm leading-tight", b.cls)}>
                            {b.label}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.category === "drinks" && (
                      <div className="absolute bottom-1.5 right-1.5 w-5 h-5 rounded-full bg-white/90 shadow-sm flex items-center justify-center">
                        {item.subcategory === "hot" ? (
                          <Flame size={10} className="text-orange-500" />
                        ) : (
                          <Snowflake size={10} className="text-blue-500" />
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 p-3.5 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-black leading-tight line-clamp-1">
                          {(item.name[language] ?? item.name.en)}
                        </h3>
                        <div className="flex items-center gap-1 flex-shrink-0 bg-gold/10 px-1.5 py-0.5 rounded-full">
                          <Star size={8} className="text-gold fill-gold" />
                          <span className="text-[9px] font-bold text-gold">{item.rating}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted/60 mt-1 line-clamp-2 leading-relaxed">
                        {(item.description[language] ?? item.description.en)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-warm/50">
                      <span className="text-sm font-bold text-gold">
                        {item.price} <span className="text-[10px] font-medium text-muted/50">{t.birr}</span>
                      </span>
                      <div className="flex items-center gap-2.5 text-[10px] text-muted/50">
                        <span className="flex items-center gap-1">
                          <Clock size={9} /> {item.prep_time} {t.min}
                        </span>
                        <span>{item.calories} {t.kcal}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </main>

      {/* ITEM DETAIL MODAL */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white rounded-t-[24px] max-h-[92dvh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 bg-white pt-3 pb-1 px-4 flex items-center justify-between">
                <div className="w-10 h-1 bg-border-warm rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                <button onClick={() => setSelectedItem(null)} className="ml-auto w-8 h-8 flex items-center justify-center text-muted/50 bg-cream-dark rounded-full">
                  <X size={18} />
                </button>
              </div>

              <div className="relative h-72 bg-cream-dark">
                <img src={selectedItem.image} alt={(selectedItem.name[language] ?? selectedItem.name.en)} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                  {getBadges(selectedItem).map((b) => (
                    <span key={b.label} className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm", b.cls)}>{b.label}</span>
                  ))}
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                  <h2 className="text-xl font-bold text-white drop-shadow-md">{(selectedItem.name[language] ?? selectedItem.name.en)}</h2>
                  <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm">
                    <Star size={12} className="text-gold fill-gold" />
                    <span className="text-xs font-bold text-gold">{selectedItem.rating}</span>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <p className="text-sm text-muted/70 leading-relaxed mb-5">{(selectedItem.description[language] ?? selectedItem.description.en)}</p>

                <div className="flex items-center gap-4 mb-5 p-3.5 bg-cream-dark rounded-[14px]">
                  <div className="flex-1 text-center">
                    <p className="text-[9px] text-muted/50 uppercase tracking-wider font-medium">{t.price}</p>
                    <p className="text-lg font-bold text-gold">{selectedItem.price} {t.birr}</p>
                  </div>
                  <div className="w-px h-10 bg-border-warm" />
                  <div className="flex-1 text-center">
                    <p className="text-[9px] text-muted/50 uppercase tracking-wider font-medium">{t.calories}</p>
                    <p className="text-sm font-bold text-black">{selectedItem.calories}</p>
                  </div>
                  <div className="w-px h-10 bg-border-warm" />
                  <div className="flex-1 text-center">
                    <p className="text-[9px] text-muted/50 uppercase tracking-wider font-medium">{t.prepTime}</p>
                    <p className="text-sm font-bold text-black">{selectedItem.prep_time} {t.min}</p>
                  </div>
                </div>

                <div className="mb-5">
                  <h4 className="text-[10px] font-bold text-black uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <UtensilsCrossed size={12} className="text-gold" /> {t.ingredients}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedItem.ingredients[language] ?? selectedItem.ingredients.en).map((ing, idx) => (
                      <span key={idx} className="text-[11px] text-muted bg-cream-dark px-2.5 py-1 rounded-full">{ing}</span>
                    ))}
                  </div>
                </div>

                {(selectedItem.allergens[language] ?? selectedItem.allergens.en).filter((a) => a.toLowerCase() !== "none").length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-black uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <Shield size={12} className="text-gold" /> {t.allergens}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(selectedItem.allergens[language] ?? selectedItem.allergens.en).filter((a) => a.toLowerCase() !== "none").map((a, idx) => (
                        <span key={idx} className="text-[11px] text-[#C0392B] bg-red-50 px-2.5 py-1 rounded-full border border-red-100">{a}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-4" />
    </div>
  );
};
