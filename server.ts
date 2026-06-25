import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

// Security: secret used to sign session tokens. In production this MUST be set
// via the JWT_SECRET environment variable — the fallback below is only for
// convenience in local development and is not safe to rely on for real users.
// If this repo is public on GitHub, the fallback string is public too, so
// anyone could forge a valid session cookie for any account unless a real
// secret is set in the deployment environment.
const INSECURE_DEFAULT_SECRET = "dev-only-insecure-secret-change-me";
const JWT_SECRET = process.env.JWT_SECRET || INSECURE_DEFAULT_SECRET;
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    console.error(
      "❌ JWT_SECRET is not set. Refusing to start in production with the public default secret.\n" +
        "   Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"\n" +
        "   and set it as the JWT_SECRET environment variable."
    );
    process.exit(1);
  }
  console.warn("⚠️  JWT_SECRET is not set — using an insecure dev-only default. Do not use this in production.");
}
const TOKEN_COOKIE = "achridz_token";
const TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  wilaya: string;
  favorites: string[];
}

function signToken(userId: string) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "30d" });
}

function publicUser(u: any): SessionUser {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, wilaya: u.wilaya, favorites: u.favorites || [] };
}

// Computes ratingAverage/ratingCount from a listing's reviews on the fly,
// rather than storing them, so they can never drift out of sync.
function withComputedRating(listing: any) {
  const reviews = listing.reviews || [];
  const ratingCount = reviews.length;
  const ratingAverage = ratingCount > 0
    ? Math.round((reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / ratingCount) * 10) / 10
    : 0;
  return { ...listing, reviews, ratingAverage, ratingCount };
}

// Initialize Gemini SDK lazily if key is available
let ai: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!ai && process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
}

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "data", "db.json");

// Behind a reverse proxy (Render, Railway, Nginx, etc.) so rate limiting and
// `secure` cookies see the real client IP/protocol instead of the proxy's.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Security: Set secure HTTP headers (disable CSP for Vite compatibility)
app.use(helmet({ contentSecurityPolicy: false }));

// Security: Enable CORS. In production, only the configured APP_URL is
// allowed to make credentialed requests — reflecting every origin
// (`origin: true`) alongside `credentials: true` would let any website read
// authenticated responses on a visitor's behalf. In development, allow any
// localhost origin so the Vite dev server works without extra config.
const allowedOrigin = process.env.APP_URL;
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // same-origin / curl / server-to-server
      if (process.env.NODE_ENV !== "production") return callback(null, true);
      if (allowedOrigin && origin === allowedOrigin) return callback(null, true);
      callback(new Error("Origine non autorisée par la politique CORS."));
    },
    credentials: true,
  })
);
app.use(cookieParser());

// Security: Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: { error: "Trop de requêtes depuis cette adresse IP, veuillez réessayer plus tard." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter); // Apply rate limiter only to API routes

// Security: Strict payload limit to prevent large file crashes
app.use(express.json({ limit: "500kb" }));

// Helper to ensure DB exists and read it
function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      // Create empty DB if not exists
      const parentDir = path.dirname(DB_PATH);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      const initialData = { listings: [], messages: [], users: [] };
      fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    const data = JSON.parse(raw);
    // Backward compatibility: older db.json files may not have a users array yet.
    if (!data.users) data.users = [];
    data.users.forEach((u: any) => {
      if (!u.favorites) u.favorites = [];
    });
    // Backward compatibility: older listings may be missing the new
    // e-commerce fields (gallery images, stock quantity, reviews).
    data.listings.forEach((l: any) => {
      if (!l.images || l.images.length === 0) l.images = l.imageUrl ? [l.imageUrl] : [];
      if (typeof l.quantity !== "number") l.quantity = 1;
      if (!l.reviews) l.reviews = [];
    });
    return data;
  } catch (err) {
    console.error("Error reading DB:", err);
    return { listings: [], messages: [], users: [] };
  }
}

// Helper to write DB
function writeDB(data: any) {
  try {
    const parentDir = path.dirname(DB_PATH);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing DB:", err);
  }
}

// ------------------- AUTH HELPERS & ROUTES -------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Reads the session cookie (if any) and attaches req.user when valid.
// Does not block the request — routes decide whether auth is required.
function attachUser(req: any, _res: any, next: any) {
  const token = req.cookies?.[TOKEN_COOKIE];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const db = readDB();
    const dbUser = db.users.find((u: any) => u.id === payload.sub);
    if (dbUser) req.user = publicUser(dbUser);
  } catch {
    // Invalid/expired token — treat as logged out rather than erroring.
  }
  next();
}
app.use(attachUser);

function requireAuth(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ error: "Vous devez être connecté pour effectuer cette action." });
  }
  next();
}

function setSessionCookie(res: any, userId: string) {
  res.cookie(TOKEN_COOKIE, signToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TOKEN_MAX_AGE_MS,
  });
}

// Stricter rate limit for auth endpoints to slow down credential guessing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Trop de tentatives. Veuillez réessayer plus tard." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Register a new account
app.post("/api/auth/register", authLimiter, async (req, res) => {
  const { name, email, phone, wilaya, password } = req.body;

  if (!name || !email || !phone || !wilaya || !password) {
    return res.status(400).json({ error: "Veuillez remplir tous les champs." });
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Adresse email invalide." });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères." });
  }

  const db = readDB();
  const normalizedEmail = email.toLowerCase().trim();
  if (db.users.some((u: any) => u.email === normalizedEmail)) {
    return res.status(409).json({ error: "Un compte existe déjà avec cet email." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    id: `user-${Date.now()}`,
    name,
    email: normalizedEmail,
    phone,
    wilaya,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  writeDB(db);

  setSessionCookie(res, newUser.id);
  res.status(201).json(publicUser(newUser));
});

// Log in to an existing account
app.post("/api/auth/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || typeof email !== "string") {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }

  const db = readDB();
  const normalizedEmail = email.toLowerCase().trim();
  const dbUser = db.users.find((u: any) => u.email === normalizedEmail);

  // Compare against a dummy hash when the user doesn't exist, so response
  // timing doesn't reveal whether an email is registered.
  const hashToCheck = dbUser?.passwordHash || "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidi";
  const valid = await bcrypt.compare(password, hashToCheck);

  if (!dbUser || !valid) {
    return res.status(401).json({ error: "Email ou mot de passe incorrect." });
  }

  setSessionCookie(res, dbUser.id);
  res.json(publicUser(dbUser));
});

// Log out
app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie(TOKEN_COOKIE);
  res.status(204).end();
});

// Get the currently logged-in user (if any)
app.get("/api/auth/me", (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: "Non connecté." });
  res.json(req.user);
});

// ------------------- API ROUTES -------------------

// 1. Get all listings with filter & search
app.get("/api/listings", (req, res) => {
  const db = readDB();
  let results = [...db.listings];

  const search = req.query.search as string;
  const category = req.query.category as string;
  const wilaya = req.query.wilaya as string;
  const type = req.query.type as string; // 'buy_it_now' | 'auction'
  const filterUser = req.query.sellerEmail as string; // filter by seller
  const transactionMode = req.query.transactionMode as string; // 'sell' | 'buy'

  // Ensure backward compatibility by mapping missing transactionMode to "sell"
  results = results.map((item) => {
    if (!item.transactionMode) {
      item.transactionMode = "sell";
    }
    return item;
  });

  if (search) {
    const term = search.toLowerCase();
    results = results.filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term)
    );
  }

  if (category && category !== "Toutes") {
    results = results.filter((item) => item.category === category);
  }

  if (wilaya && wilaya !== "Toutes") {
    results = results.filter((item) => item.wilaya === wilaya);
  }

  if (type && type !== "Toutes") {
    results = results.filter((item) => item.type === type);
  }

  if (transactionMode && transactionMode !== "Toutes") {
    results = results.filter((item) => item.transactionMode === transactionMode);
  }

  if (filterUser) {
    results = results.filter((item) => item.sellerEmail === filterUser);
  }

  // Sort by newest first
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(results.map(withComputedRating));
});

// 2. Get specific listing & increment views
app.get("/api/listings/:id", (req: any, res) => {
  const db = readDB();
  const listingIndex = db.listings.findIndex((item: any) => item.id === req.params.id);

  if (listingIndex === -1) {
    return res.status(404).json({ error: "Annonce introuvable" });
  }

  // Increment view counter, but not when the owner is viewing their own ad.
  const isOwner = req.user && req.user.email === db.listings[listingIndex].sellerEmail;
  if (!isOwner) {
    db.listings[listingIndex].views = (db.listings[listingIndex].views || 0) + 1;
    writeDB(db);
  }

  res.json(withComputedRating(db.listings[listingIndex]));
});

// 3. Create listing (requires a logged-in account — seller identity is taken
// from the session, not from the request body, so users can't post as someone else)
app.post("/api/listings", requireAuth, (req: any, res) => {
  const {
    title,
    description,
    category,
    price,
    condition,
    type,
    transactionMode,
    imageUrl,
    images,
    quantity,
    sellerName,
    sellerPhone,
    wilaya,
    auctionEndDays,
  } = req.body;

  if (!title || !category || !price || !wilaya) {
    return res.status(400).json({ error: "Veuillez remplir tous les champs obligatoires." });
  }

  // Security: Basic input type validation
  if (typeof title !== "string" || typeof category !== "string" || typeof wilaya !== "string") {
    return res.status(400).json({ error: "Format de données invalide." });
  }
  if (title.trim().length < 3 || title.trim().length > 120) {
    return res.status(400).json({ error: "Le titre doit contenir entre 3 et 120 caractères." });
  }
  if (!Number.isFinite(Number(price)) || Number(price) <= 0) {
    return res.status(400).json({ error: "Le prix doit être un nombre positif." });
  }

  const db = readDB();

  const defaultImage = "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=60";
  const galleryImages: string[] = Array.isArray(images)
    ? images.filter((u: any) => typeof u === "string" && u.trim()).slice(0, 8)
    : [];
  const primaryImage = imageUrl || galleryImages[0] || defaultImage;

  const newListing: any = {
    id: `list-${Date.now()}`,
    title,
    description: description || "Aucune description fournie.",
    category,
    price: Number(price),
    condition: condition || "Bon état",
    type: type || "buy_it_now",
    transactionMode: transactionMode || "sell",
    imageUrl: primaryImage,
    images: galleryImages.length > 0 ? galleryImages : [primaryImage],
    quantity: type === "auction" ? 1 : Math.max(1, Number(quantity) || 1),
    // Seller identity always comes from the authenticated session.
    sellerName: sellerName || req.user.name,
    sellerPhone: sellerPhone || req.user.phone,
    sellerEmail: req.user.email,
    wilaya,
    createdAt: new Date().toISOString(),
    bids: [],
    views: 0,
    sold: false,
    soldTo: null,
    reviews: [],
  };

  if (type === "auction") {
    const days = Number(auctionEndDays) || 3;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    newListing.auctionEnd = endDate.toISOString();
  }

  db.listings.unshift(newListing);
  writeDB(db);

  res.status(201).json(withComputedRating(newListing));
});

// 4. Place a bid on an auction
app.post("/api/listings/:id/bids", (req: any, res) => {
  const { bidderName, bidderPhone, amount } = req.body;

  if (!bidderName || !bidderPhone || !amount) {
    return res.status(400).json({ error: "Veuillez indiquer votre nom, téléphone et le montant de l'offre." });
  }

  const db = readDB();
  const listingIndex = db.listings.findIndex((item: any) => item.id === req.params.id);

  if (listingIndex === -1) {
    return res.status(404).json({ error: "Annonce introuvable." });
  }

  const listing = db.listings[listingIndex];

  if (req.user && req.user.email === listing.sellerEmail) {
    return res.status(400).json({ error: "Vous ne pouvez pas enchérir sur votre propre annonce." });
  }

  if (listing.type !== "auction") {
    return res.status(400).json({ error: "Ce produit n'est pas vendu aux enchères." });
  }

  if (listing.sold || new Date(listing.auctionEnd).getTime() < Date.now()) {
    return res.status(400).json({ error: "Ces enchères sont terminées." });
  }

  const bidAmount = Number(amount);
  const currentMaxBid = listing.bids.length > 0 
    ? Math.max(...listing.bids.map((b: any) => b.amount)) 
    : listing.price;

  if (bidAmount <= currentMaxBid) {
    return res.status(400).json({ 
      error: `Votre offre doit être supérieure à l'offre actuelle (${currentMaxBid} DA).` 
    });
  }

  const newBid = {
    bidderName,
    bidderPhone,
    amount: bidAmount,
    timestamp: new Date().toISOString(),
  };

  listing.bids.push(newBid);
  // Sort bids descending
  listing.bids.sort((a: any, b: any) => b.amount - a.amount);
  
  db.listings[listingIndex] = listing;
  writeDB(db);

  res.json(withComputedRating(listing));
});

// 5. Simulate Buying/Checkout (single item — kept for the "Acheter maintenant"
// quick-buy flow on the listing detail page; see /api/checkout for cart purchases)
app.post("/api/listings/:id/buy", (req: any, res) => {
  const { buyerName, buyerPhone, buyerAddress, wilayaDelivery, deliveryType, quantity } = req.body;

  if (!buyerName || !buyerPhone || !buyerAddress) {
    return res.status(400).json({ error: "Veuillez remplir vos informations de livraison." });
  }

  const db = readDB();
  const listingIndex = db.listings.findIndex((item: any) => item.id === req.params.id);

  if (listingIndex === -1) {
    return res.status(404).json({ error: "Annonce introuvable." });
  }

  const listing = db.listings[listingIndex];
  if (req.user && req.user.email === listing.sellerEmail) {
    return res.status(400).json({ error: "Vous ne pouvez pas acheter votre propre annonce." });
  }
  if (listing.sold) {
    return res.status(400).json({ error: "Ce produit a déjà été vendu." });
  }

  const qty = Math.max(1, Number(quantity) || 1);
  const available = typeof listing.quantity === "number" ? listing.quantity : 1;
  if (qty > available) {
    return res.status(400).json({ error: `Stock insuffisant (${available} disponible(s)).` });
  }

  listing.quantity = available - qty;
  if (listing.quantity <= 0) {
    listing.sold = true;
    listing.soldTo = buyerName;
  }
  listing.buyerDetails = {
    buyerName,
    buyerPhone,
    buyerAddress,
    wilayaDelivery,
    deliveryType,
    quantity: qty,
    purchasedAt: new Date().toISOString()
  };

  db.listings[listingIndex] = listing;
  writeDB(db);

  res.json(withComputedRating(listing));
});

// 5b. Multi-item cart checkout — buys several buy_it_now listings at once.
app.post("/api/checkout", (req: any, res) => {
  const { items, buyerName, buyerPhone, buyerAddress, wilayaDelivery, deliveryType } = req.body;

  if (!buyerName || !buyerPhone || !buyerAddress) {
    return res.status(400).json({ error: "Veuillez remplir vos informations de livraison." });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Votre panier est vide." });
  }

  const db = readDB();
  const results: any[] = [];

  for (const item of items) {
    const listingId = item?.listingId;
    const qty = Math.max(1, Number(item?.quantity) || 1);
    const listingIndex = db.listings.findIndex((l: any) => l.id === listingId);

    if (listingIndex === -1) {
      results.push({ listingId, success: false, error: "Annonce introuvable." });
      continue;
    }
    const listing = db.listings[listingIndex];
    if (req.user && req.user.email === listing.sellerEmail) {
      results.push({ listingId, success: false, error: "Vous ne pouvez pas acheter votre propre annonce." });
      continue;
    }
    if (listing.type === "auction") {
      results.push({ listingId, success: false, error: "Les enchères ne peuvent pas être achetées via le panier." });
      continue;
    }
    if (listing.sold) {
      results.push({ listingId, success: false, error: "Ce produit a déjà été vendu." });
      continue;
    }
    const available = typeof listing.quantity === "number" ? listing.quantity : 1;
    if (qty > available) {
      results.push({ listingId, success: false, error: `Stock insuffisant (${available} disponible(s)).` });
      continue;
    }

    listing.quantity = available - qty;
    if (listing.quantity <= 0) {
      listing.sold = true;
      listing.soldTo = buyerName;
    }
    listing.buyerDetails = {
      buyerName,
      buyerPhone,
      buyerAddress,
      wilayaDelivery,
      deliveryType,
      quantity: qty,
      purchasedAt: new Date().toISOString(),
    };
    db.listings[listingIndex] = listing;
    results.push({ listingId, success: true, listing: withComputedRating(listing) });
  }

  writeDB(db);

  const allSucceeded = results.every((r) => r.success);
  res.status(allSucceeded ? 200 : 207).json({ results });
});

// ------------------- REVIEWS -------------------

// Submit (or update) a review for a listing. One review per user per listing.
app.post("/api/listings/:id/reviews", requireAuth, (req: any, res) => {
  const { rating, comment } = req.body;
  const ratingNum = Number(rating);

  if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: "La note doit être comprise entre 1 et 5." });
  }

  const db = readDB();
  const listingIndex = db.listings.findIndex((l: any) => l.id === req.params.id);
  if (listingIndex === -1) {
    return res.status(404).json({ error: "Annonce introuvable." });
  }

  const listing = db.listings[listingIndex];
  if (!listing.reviews) listing.reviews = [];

  const existingIndex = listing.reviews.findIndex((r: any) => r.reviewerEmail === req.user.email);
  const review = {
    id: existingIndex >= 0 ? listing.reviews[existingIndex].id : `rev-${Date.now()}`,
    listingId: listing.id,
    reviewerName: req.user.name,
    reviewerEmail: req.user.email,
    rating: ratingNum,
    comment: comment || "",
    createdAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    listing.reviews[existingIndex] = review;
  } else {
    listing.reviews.push(review);
  }

  db.listings[listingIndex] = listing;
  writeDB(db);

  res.status(201).json(withComputedRating(listing));
});

// ------------------- FAVORITES / WISHLIST -------------------

// Toggle a listing in the current user's favorites list.
app.post("/api/favorites/:id/toggle", requireAuth, (req: any, res) => {
  const db = readDB();
  const userIndex = db.users.findIndex((u: any) => u.id === req.user.id);
  if (userIndex === -1) {
    return res.status(404).json({ error: "Utilisateur introuvable." });
  }

  const dbUser = db.users[userIndex];
  if (!dbUser.favorites) dbUser.favorites = [];

  const listingId = req.params.id;
  const idx = dbUser.favorites.indexOf(listingId);
  if (idx >= 0) {
    dbUser.favorites.splice(idx, 1);
  } else {
    dbUser.favorites.push(listingId);
  }

  db.users[userIndex] = dbUser;
  writeDB(db);

  res.json(publicUser(dbUser));
});

// Get the current user's favorited listings (full listing objects).
app.get("/api/favorites", requireAuth, (req: any, res) => {
  const db = readDB();
  const favIds: string[] = req.user.favorites || [];
  const favorites = db.listings
    .filter((l: any) => favIds.includes(l.id))
    .map(withComputedRating);
  res.json(favorites);
});

// ------------------- LISTING MANAGEMENT (owner only) -------------------

// Update a listing the current user owns (e.g. mark as sold/active, edit fields).
app.patch("/api/listings/:id", requireAuth, (req: any, res) => {
  const db = readDB();
  const listingIndex = db.listings.findIndex((l: any) => l.id === req.params.id);
  if (listingIndex === -1) {
    return res.status(404).json({ error: "Annonce introuvable." });
  }

  const listing = db.listings[listingIndex];
  if (listing.sellerEmail !== req.user.email) {
    return res.status(403).json({ error: "Vous n'êtes pas autorisé à modifier cette annonce." });
  }

  const allowedFields = ["title", "description", "price", "condition", "quantity", "sold", "imageUrl", "images"];
  for (const field of allowedFields) {
    if (field in req.body) {
      if (field === "price") {
        const price = Number(req.body.price);
        if (!price || price <= 0) {
          return res.status(400).json({ error: "Prix invalide." });
        }
        listing.price = price;
      } else if (field === "quantity") {
        const qty = Math.max(0, Number(req.body.quantity) || 0);
        listing.quantity = qty;
        if (qty <= 0) listing.sold = true;
      } else if (field === "sold") {
        listing.sold = Boolean(req.body.sold);
      } else if (field === "title" || field === "description" || field === "condition" || field === "imageUrl") {
        if (typeof req.body[field] === "string" && req.body[field].trim()) {
          listing[field] = req.body[field].trim();
        }
      } else if (field === "images" && Array.isArray(req.body.images)) {
        listing.images = req.body.images.filter((u: any) => typeof u === "string" && u.trim()).slice(0, 8);
      }
    }
  }

  db.listings[listingIndex] = listing;
  writeDB(db);
  res.json(withComputedRating(listing));
});

// Delete a listing the current user owns.
app.delete("/api/listings/:id", requireAuth, (req: any, res) => {
  const db = readDB();
  const listingIndex = db.listings.findIndex((l: any) => l.id === req.params.id);
  if (listingIndex === -1) {
    return res.status(404).json({ error: "Annonce introuvable." });
  }
  if (db.listings[listingIndex].sellerEmail !== req.user.email) {
    return res.status(403).json({ error: "Vous n'êtes pas autorisé à supprimer cette annonce." });
  }
  db.listings.splice(listingIndex, 1);
  writeDB(db);
  res.status(204).end();
});

// ------------------- PUBLIC SELLER PROFILE -------------------

// Public profile for any seller: aggregate rating across all their listings,
// total listings count, and their currently active (unsold) listings.
app.get("/api/sellers/:email", (req, res) => {
  const db = readDB();
  const email = decodeURIComponent(req.params.email).toLowerCase().trim();
  const sellerListings = db.listings.filter((l: any) => l.sellerEmail?.toLowerCase() === email);

  if (sellerListings.length === 0) {
    return res.status(404).json({ error: "Vendeur introuvable." });
  }

  const dbUser = db.users.find((u: any) => u.email === email);
  const allReviews = sellerListings.flatMap((l: any) => l.reviews || []);
  const ratingCount = allReviews.length;
  const ratingAverage = ratingCount > 0
    ? Math.round((allReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / ratingCount) * 10) / 10
    : 0;

  res.json({
    name: sellerListings[0].sellerName,
    email,
    wilaya: dbUser?.wilaya || sellerListings[0].wilaya,
    memberSince: dbUser?.createdAt || sellerListings[sellerListings.length - 1].createdAt,
    totalListings: sellerListings.length,
    ratingAverage,
    ratingCount,
    listings: sellerListings.filter((l: any) => !l.sold).map(withComputedRating),
  });
});

// 6. Get messages for a listing
// This is a public Q&A-style thread (like a classifieds comment box), so the
// text itself is visible to anyone viewing the listing. Phone numbers typed
// into it are not, though — they're only ever returned to the listing's
// owner, who needs them to call buyers back.
app.get("/api/listings/:id/messages", (req: any, res) => {
  const db = readDB();
  const listing = db.listings.find((item: any) => item.id === req.params.id);
  const isOwner = !!(listing && req.user && req.user.email === listing.sellerEmail);
  const messages = db.messages
    .filter((msg: any) => msg.listingId === req.params.id)
    .map((msg: any) => (isOwner ? msg : { ...msg, senderPhone: undefined }));
  res.json(messages);
});

// 7. Post a message to a listing
app.post("/api/listings/:id/messages", (req, res) => {
  const { senderName, senderPhone, text } = req.body;

  if (!senderName || !text) {
    return res.status(400).json({ error: "Le nom de l'expéditeur et le message sont requis." });
  }

  const db = readDB();

  const newMessage = {
    id: `msg-${Date.now()}`,
    listingId: req.params.id,
    senderName,
    senderPhone: senderPhone || "",
    text,
    timestamp: new Date().toISOString(),
  };

  db.messages.push(newMessage);
  writeDB(db);

  res.status(201).json(newMessage);
});

// 8. Generate description using Gemini
app.post("/api/generate-description", async (req, res) => {
  const { title, category, condition, details } = req.body;

  if (!title || !category) {
    return res.status(400).json({ error: "Le titre et la catégorie sont obligatoires." });
  }

  const gemini = getGemini();
  if (!gemini) {
    return res.json({ 
      description: `**[Aperçu Mode Démo - Clé API non configurée]**\n\nMagnifique **${title}** en état **${condition || 'Bon état'}**.\n\n` +
      `- Produit de qualité supérieure dans la catégorie *${category}*.\n` +
      `- Prix très attractif.\n` +
      `- Remise en main propre ou possibilité de livraison dans votre wilaya (Yalidine Express).\n\n` +
      `*Marhaban bikoum ! N'hésitez pas à me contacter par téléphone ou messagerie pour plus d'informations.*`
    });
  }

  try {
    const prompt = `Génère une description commerciale, détaillée et chaleureuse en français pour un site de vente en ligne en Algérie (nommé Achri DZ).\n` +
      `Produit : ${title}\n` +
      `Catégorie : ${category}\n` +
      `État : ${condition || "Non précisé"}\n` +
      `Détails additionnels : ${details || "Aucun détail fourni"}\n\n` +
      `Règles de rédaction :\n` +
      `1. Écris en français avec des expressions chaleureuses bienveillantes (ex: Marhaban bikoum, Salam, Sérieux uniquement, n'hésitez pas).\n` +
      `2. Structure avec des puces claires (Caractéristiques, État du produit, Livraison/Remise).\n` +
      `3. Mentionne que la livraison est disponible via Yalidine Express (à domicile ou point de retrait) ou remise en main propre.\n` +
      `4. Reste professionnel et concis (environ 150-200 mots). Ne mets pas de faux numéros de téléphone générés, juste une phrase disant de contacter le vendeur par la messagerie ou le bouton d'appel.`;

    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const description = response.text || "Erreur de génération.";
    res.json({ description });
  } catch (err: any) {
    console.error("Gemini description error:", err);
    res.status(500).json({ error: "Échec de génération de la description via l'IA." });
  }
});

// ------------------- VITE OR STATIC SERVING -------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`===========================================`);
    console.log(`🚀 Achri DZ - Algeria Marketplace is running at http://0.0.0.0:${PORT}`);
    console.log(`===========================================`);
  });
}

startServer();
