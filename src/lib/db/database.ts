import { supabase } from "@/lib/supabase";
import { MenuItem } from "@/data/menuData";

// ─── Categories ──────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
}

export async function getAllCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data || [];
}

export async function createCategory(cat: { name: string; slug: string; sort_order: number }) {
  const { error } = await supabase.from("categories").insert(cat);
  if (error) throw error;
}

export async function updateCategory(id: string, updates: Partial<Category>) {
  const { error } = await supabase.from("categories").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

// ─── Menu Items ──────────────────────────────────────────────
function rowToMenuItem(row: any): MenuItem {
  return {
    id: row.id,
    category: row.category,
    subcategory: row.subcategory || undefined,
    name: row.name,
    description: row.description,
    ingredients: row.ingredients,
    price: row.price,
    calories: row.calories,
    prep_time: row.prep_time,
    image: row.image,
    rating: row.rating,
    is_best_seller: row.is_best_seller,
    is_signature: row.is_signature,
    is_new: row.is_new,
    is_spicy: row.is_spicy,
    is_available: row.is_available,
    allergens: row.allergens,
    isFasting: row.isFasting,
  };
}

export async function getAllMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .order("id");
  if (error) throw error;
  return (data || []).map(rowToMenuItem);
}

export async function upsertMenuItem(item: MenuItem) {
  const { error } = await supabase
    .from("menu_items")
    .upsert(
      { ...item, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );
  if (error) throw error;
}

export async function upsertMenuItems(items: MenuItem[]) {
  const { error } = await supabase.from("menu_items").upsert(
    items.map((i) => ({ ...i, updated_at: new Date().toISOString() })),
    { onConflict: "id" }
  );
  if (error) throw error;
}

export async function deleteMenuItem(id: string) {
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) throw error;
}

// ─── Reviews ─────────────────────────────────────────────────
export interface Review {
  id: string;
  itemId: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

export async function getAllReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addReview(review: Review) {
  const { error } = await supabase.from("reviews").insert(review);
  if (error) throw error;
}

export async function deleteReview(id: string) {
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) throw error;
}

// ─── Orders ──────────────────────────────────────────────────
export interface Order {
  id: string;
  tableNumber: string;
  customerName: string;
  phoneNumber: string;
  specialNotes: string;
  items: string;
  totalAmount: number;
  paymentMethod: string;
  paymentScreenshot: string;
  status: string;
  createdAt: string;
}

export async function createOrder(order: Order) {
  const { error } = await supabase.from("orders").insert(order);
  if (error) throw error;
}

export async function getAllOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getOrderById(id: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

export async function updateOrderStatus(id: string, status: string) {
  const { error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function getNextOrderNumber(): Promise<number> {
  const { count, error } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true });
  if (error) return 1;
  return (count || 0) + 1;
}

// ─── Realtime Subscriptions ──────────────────────────────────
export function subscribeToMenuItems(callback: () => void) {
  return supabase
    .channel("menu_items_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "menu_items" },
      callback
    )
    .subscribe();
}

export function subscribeToCategories(callback: () => void) {
  return supabase
    .channel("categories_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "categories" },
      callback
    )
    .subscribe();
}
