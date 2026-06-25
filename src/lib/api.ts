import type { CurrentUser, Listing, Message } from "../types";

const BASE = "/api";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Une erreur est survenue." }));
    throw new Error(body.error || `Erreur ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ------------------- AUTH -------------------
// All auth calls use credentials: "include" so the httpOnly session cookie
// set by the server is sent/received.

export async function registerAccount(payload: {
  name: string;
  email: string;
  phone: string;
  wilaya: string;
  password: string;
}): Promise<CurrentUser> {
  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<CurrentUser>(res);
}

export async function loginAccount(payload: { email: string; password: string }): Promise<CurrentUser> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<CurrentUser>(res);
}

export async function logoutAccount(): Promise<void> {
  const res = await fetch(`${BASE}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  return handle<void>(res);
}

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const res = await fetch(`${BASE}/auth/me`, { credentials: "include" });
  if (res.status === 401) return null;
  return handle<CurrentUser>(res);
}

export interface ListingFilters {
  search?: string;
  category?: string;
  wilaya?: string;
  type?: string;
  sellerEmail?: string;
  transactionMode?: string;
}

export async function fetchListings(filters: ListingFilters = {}): Promise<Listing[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const res = await fetch(`${BASE}/listings?${params.toString()}`);
  return handle<Listing[]>(res);
}

export async function fetchListing(id: string): Promise<Listing> {
  const res = await fetch(`${BASE}/listings/${id}`);
  return handle<Listing>(res);
}

export async function createListing(payload: Partial<Listing>): Promise<Listing> {
  const res = await fetch(`${BASE}/listings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<Listing>(res);
}

export async function placeBid(
  id: string,
  payload: { bidderName: string; bidderPhone: string; amount: number }
): Promise<Listing> {
  const res = await fetch(`${BASE}/listings/${id}/bids`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<Listing>(res);
}

export async function buyListing(
  id: string,
  payload: {
    buyerName: string;
    buyerPhone: string;
    buyerAddress: string;
    wilayaDelivery?: string;
    deliveryType?: string;
    quantity?: number;
  }
): Promise<Listing> {
  const res = await fetch(`${BASE}/listings/${id}/buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<Listing>(res);
}

// ------------------- CART CHECKOUT -------------------

export interface CheckoutResult {
  listingId: string;
  success: boolean;
  error?: string;
  listing?: Listing;
}

export async function checkout(payload: {
  items: { listingId: string; quantity: number }[];
  buyerName: string;
  buyerPhone: string;
  buyerAddress: string;
  wilayaDelivery?: string;
  deliveryType?: string;
}): Promise<{ results: CheckoutResult[] }> {
  const res = await fetch(`${BASE}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ results: CheckoutResult[] }>(res);
}

// ------------------- REVIEWS -------------------

export async function submitReview(
  listingId: string,
  payload: { rating: number; comment?: string }
): Promise<Listing> {
  const res = await fetch(`${BASE}/listings/${listingId}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<Listing>(res);
}

// ------------------- FAVORITES / WISHLIST -------------------

export async function toggleFavorite(listingId: string): Promise<CurrentUser> {
  const res = await fetch(`${BASE}/favorites/${listingId}/toggle`, {
    method: "POST",
    credentials: "include",
  });
  return handle<CurrentUser>(res);
}

export async function fetchFavorites(): Promise<Listing[]> {
  const res = await fetch(`${BASE}/favorites`, { credentials: "include" });
  return handle<Listing[]>(res);
}

export async function fetchMessages(listingId: string): Promise<Message[]> {
  const res = await fetch(`${BASE}/listings/${listingId}/messages`);
  return handle<Message[]>(res);
}

export async function postMessage(
  listingId: string,
  payload: { senderName: string; senderPhone?: string; text: string }
): Promise<Message> {
  const res = await fetch(`${BASE}/listings/${listingId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<Message>(res);
}

// ------------------- LISTING MANAGEMENT (owner only) -------------------

export async function updateListing(
  id: string,
  payload: Partial<Pick<Listing, "title" | "description" | "price" | "condition" | "quantity" | "sold" | "imageUrl" | "images">>
): Promise<Listing> {
  const res = await fetch(`${BASE}/listings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<Listing>(res);
}

export async function deleteListing(id: string): Promise<void> {
  const res = await fetch(`${BASE}/listings/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handle<void>(res);
}

// ------------------- PUBLIC SELLER PROFILE -------------------

export interface SellerProfile {
  name: string;
  email: string;
  wilaya: string;
  memberSince: string;
  totalListings: number;
  ratingAverage: number;
  ratingCount: number;
  listings: Listing[];
}

export async function fetchSellerProfile(email: string): Promise<SellerProfile> {
  const res = await fetch(`${BASE}/sellers/${encodeURIComponent(email)}`);
  return handle<SellerProfile>(res);
}

export async function generateDescription(payload: {
  title: string;
  category: string;
  condition?: string;
  details?: string;
}): Promise<{ description: string }> {
  const res = await fetch(`${BASE}/generate-description`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<{ description: string }>(res);
}
