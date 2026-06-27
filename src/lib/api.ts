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

export async function googleLogin(idToken: string): Promise<CurrentUser> {
  const res = await fetch(`${BASE}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ idToken }),
  });
  return handle<CurrentUser>(res);
}

export async function resendVerificationEmail(): Promise<void> {
  const res = await fetch(`${BASE}/auth/resend-verification-email`, {
    method: "POST",
    credentials: "include",
  });
  return handle<void>(res);
}

export async function requestPhoneOtp(): Promise<void> {
  const res = await fetch(`${BASE}/auth/request-phone-otp`, {
    method: "POST",
    credentials: "include",
  });
  return handle<void>(res);
}

export async function verifyPhoneOtp(code: string): Promise<CurrentUser> {
  const res = await fetch(`${BASE}/auth/verify-phone-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ code }),
  });
  return handle<CurrentUser>(res);
}

export interface AppConfig {
  googleClientId: string | null;
}

export async function fetchAppConfig(): Promise<AppConfig> {
  const res = await fetch(`${BASE}/config`);
  return handle<AppConfig>(res);
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
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "popular";
  page?: number;
  pageSize?: number;
}

export async function fetchListings(filters: ListingFilters = {}): Promise<Listing[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const res = await fetch(`${BASE}/listings?${params.toString()}`);
  return handle<Listing[]>(res);
}

export interface PagedListings {
  items: Listing[];
  total: number;
}

export async function fetchListingsPaged(filters: ListingFilters = {}): Promise<PagedListings> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const res = await fetch(`${BASE}/listings?${params.toString()}`);
  const items = await handle<Listing[]>(res);
  const total = Number(res.headers.get("X-Total-Count")) || items.length;
  return { items, total };
}

export async function fetchListing(id: string): Promise<Listing> {
  const res = await fetch(`${BASE}/listings/${id}`);
  return handle<Listing>(res);
}

export async function fetchSimilarListings(id: string, limit = 8): Promise<Listing[]> {
  const res = await fetch(`${BASE}/listings/${id}/similar?limit=${limit}`);
  return handle<Listing[]>(res);
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
  payload: { amount: number }
): Promise<Listing> {
  const res = await fetch(`${BASE}/listings/${id}/bids`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<Listing>(res);
}

export async function buyListing(
  id: string,
  payload: {
    buyerAddress: string;
    wilayaDelivery?: string;
    deliveryType?: string;
    quantity?: number;
  }
): Promise<Listing> {
  const res = await fetch(`${BASE}/listings/${id}/buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
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
  payload: { text: string }
): Promise<Message> {
  const res = await fetch(`${BASE}/listings/${listingId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
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
  totalSales: number;
  ratingAverage: number;
  ratingCount: number;
  verified: boolean;
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
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle<{ description: string }>(res);
}
