export type ListingType = "buy_it_now" | "auction";
export type TransactionMode = "sell" | "buy";

export interface Bid {
  bidderName: string;
  bidderPhone: string;
  amount: number;
  timestamp: string;
}

export interface BuyerDetails {
  buyerName: string;
  buyerPhone: string;
  buyerAddress: string;
  wilayaDelivery?: string;
  deliveryType?: string;
  purchasedAt: string;
  quantity?: number;
}

export interface Review {
  id: string;
  listingId: string;
  reviewerName: string;
  reviewerEmail: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  condition: string;
  type: ListingType;
  transactionMode: TransactionMode;
  imageUrl: string;
  images: string[];
  quantity: number;
  sellerName: string;
  sellerPhone: string;
  sellerEmail: string;
  wilaya: string;
  createdAt: string;
  bids: Bid[];
  views: number;
  sold: boolean;
  soldTo: string | null;
  buyerDetails?: BuyerDetails;
  auctionEnd?: string;
  auctionEnded?: boolean;
  reviews: Review[];
  ratingAverage: number;
  ratingCount: number;
}

export interface Message {
  id: string;
  listingId: string;
  senderName: string;
  senderPhone: string;
  text: string;
  timestamp: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  wilaya: string;
  favorites: string[];
  emailVerified: boolean;
  phoneVerified: boolean;
  authProvider: "local" | "google";
}

export interface CartItem {
  listingId: string;
  quantity: number;
}

export const CATEGORIES = [
  "Téléphones & Tech",
  "Véhicules",
  "Immobilier",
  "Mode",
  "Maison & Jardin",
  "Outils & Bricolage",
  "Électroménager",
  "Loisirs & Sports",
  "Autres",
] as const;

export const WILAYAS = [
  "Alger", "Oran", "Constantine", "Annaba", "Blida", "Batna", "Sétif",
  "Tlemcen", "Béjaïa", "Tizi Ouzou", "Mostaganem", "Bechar", "Biskra",
  "El Oued", "Ghardaïa", "Ouargla", "Tiaret", "Sidi Bel Abbès", "Skikda",
  "Chlef", "Médéa", "Bordj Bou Arréridj", "Tébessa", "Jijel", "Relizane",
] as const;

export const CONDITIONS = [
  "Neuf",
  "Comme neuf",
  "Bon état",
  "État correct",
  "Pour pièces",
] as const;
