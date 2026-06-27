import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { OAuth2Client } from "google-auth-library";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import nodemailer from "nodemailer";
import twilio from "twilio";

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
  emailVerified: boolean;
  phoneVerified: boolean;
  authProvider: "local" | "google";
}

function signToken(userId: string) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "30d" });
}

function publicUser(u: any): SessionUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    wilaya: u.wilaya,
    favorites: u.favorites || [],
    emailVerified: !!u.emailVerified,
    phoneVerified: !!u.phoneVerified,
    authProvider: u.authProvider || "local",
  };
}

// ------------------- EMAIL & SMS DELIVERY -------------------
// Both deliveries degrade gracefully when no provider is configured: instead
// of failing, they log the message to the server console. This keeps
// registration/verification fully testable in local dev without needing a
// real SMTP/Twilio account, while still working for real users in production
// once SMTP_* / TWILIO_* env vars are set (see .env.example).

let mailer: ReturnType<typeof nodemailer.createTransport> | null = null;
function getMailer() {
  if (mailer) return mailer;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return mailer;
}

async function sendVerificationEmail(to: string, link: string) {
  const transport = getMailer();
  if (!transport) {
    console.log(`📧 [DEV — pas de SMTP configuré] Lien de vérification pour ${to} : ${link}`);
    return;
  }
  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: "Confirmez votre compte Achri DZ",
    html: `<p>Bonjour,</p><p>Cliquez sur ce lien pour confirmer votre adresse email :</p><p><a href="${link}">${link}</a></p><p>Ce lien expire dans 24 heures.</p>`,
  });
}

let twilioClient: ReturnType<typeof twilio> | null = null;
function getTwilioClient() {
  if (twilioClient) return twilioClient;
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return twilioClient;
}

async function sendVerificationSms(to: string, code: string) {
  const client = getTwilioClient();
  if (!client || !process.env.TWILIO_FROM_NUMBER) {
    console.log(`📱 [DEV — pas de Twilio configuré] Code de vérification pour ${to} : ${code}`);
    return;
  }
  await client.messages.create({
    to,
    from: process.env.TWILIO_FROM_NUMBER,
    body: `Achri DZ — votre code de vérification est : ${code}`,
  });
}

function generateOtp(): string {
  return String(crypto.randomInt(100000, 1000000));
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
    exposedHeaders: ["X-Total-Count"],
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

// Closes auctions whose auctionEnd has passed: the highest bidder wins
// (marked sold, buyerDetails filled from their bid) or, if nobody bid, the
// listing is flagged auctionEnded so the UI can show "no winner" instead of
// leaving it open forever. Called on every DB read (self-healing) and from
// a periodic sweep so it also runs without incoming traffic. Returns true
// if any listing was changed, so the caller knows whether to persist.
function closeExpiredAuctions(db: any): boolean {
  let changed = false;
  const now = Date.now();
  for (const listing of db.listings) {
    if (
      listing.type === "auction" &&
      !listing.sold &&
      !listing.auctionEnded &&
      listing.auctionEnd &&
      new Date(listing.auctionEnd).getTime() < now
    ) {
      const topBid = listing.bids.length > 0
        ? listing.bids.reduce((max: any, b: any) => (b.amount > max.amount ? b : max), listing.bids[0])
        : null;
      if (topBid) {
        listing.sold = true;
        listing.soldTo = topBid.bidderName;
        listing.buyerDetails = {
          buyerName: topBid.bidderName,
          buyerPhone: topBid.bidderPhone,
          buyerAddress: "",
          quantity: 1,
          purchasedAt: new Date().toISOString(),
        };
      } else {
        listing.auctionEnded = true;
      }
      changed = true;
    }
  }
  return changed;
}

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
      // Accounts created before email/phone verification existed are
      // grandfathered in as verified so they aren't suddenly locked out.
      if (u.emailVerified === undefined) u.emailVerified = true;
      if (u.phoneVerified === undefined) u.phoneVerified = false;
      if (!u.authProvider) u.authProvider = "local";
    });
    // Backward compatibility: older listings may be missing the new
    // e-commerce fields (gallery images, stock quantity, reviews).
    data.listings.forEach((l: any) => {
      if (!l.images || l.images.length === 0) l.images = l.imageUrl ? [l.imageUrl] : [];
      if (typeof l.quantity !== "number") l.quantity = 1;
      if (!l.reviews) l.reviews = [];
    });
    if (closeExpiredAuctions(data)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    }
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

// readDB/writeDB are synchronous and the route handlers that mutate the DB
// are themselves synchronous between the read and the write, but Node can
// still interleave two requests' handlers across awaited work. withDBLock
// serializes read-modify-write sections so concurrent bids/purchases can't
// race and lose an update (e.g. two buyers decrementing stale stock counts).
let dbLock: Promise<any> = Promise.resolve();
function withDBLock<T>(fn: (db: any) => T): Promise<T> {
  const run = dbLock.then(() => {
    const db = readDB();
    const result = fn(db);
    writeDB(db);
    return result;
  });
  dbLock = run.catch(() => {});
  return run;
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

// Anti-fraud guard for actions where seller trust matters (posting a listing):
// requires the account's email or phone to be confirmed via a real channel,
// not just self-declared at registration. Must run after requireAuth.
function requireVerified(req: any, res: any, next: any) {
  if (!req.user.emailVerified && !req.user.phoneVerified) {
    return res.status(403).json({
      error: "Veuillez vérifier votre adresse email ou votre numéro de téléphone avant de publier une annonce.",
    });
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

// Stricter rate limit for actions that are cheap to spam but costly to the
// platform/other users (bids, purchases, messages) or to us (Gemini calls).
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
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
  const emailVerificationToken = crypto.randomBytes(32).toString("hex");
  const newUser = {
    id: `user-${Date.now()}`,
    name,
    email: normalizedEmail,
    phone,
    wilaya,
    passwordHash,
    authProvider: "local",
    createdAt: new Date().toISOString(),
    emailVerified: false,
    emailVerificationToken,
    emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    phoneVerified: false,
  };

  db.users.push(newUser);
  writeDB(db);

  const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
  const verifyLink = `${appUrl}/api/auth/verify-email?token=${emailVerificationToken}`;
  sendVerificationEmail(normalizedEmail, verifyLink).catch((err) =>
    console.error("Échec d'envoi de l'email de vérification:", err)
  );

  setSessionCookie(res, newUser.id);
  res.status(201).json(publicUser(newUser));
});

// Confirm an account's email address via the link sent at registration.
app.get("/api/auth/verify-email", (req, res) => {
  const token = req.query.token as string;
  if (!token) {
    return res.status(400).send("Lien de vérification invalide.");
  }

  const db = readDB();
  const dbUser = db.users.find((u: any) => u.emailVerificationToken === token);

  if (!dbUser) {
    return res.status(400).send("Lien de vérification invalide ou déjà utilisé.");
  }
  if (dbUser.emailVerificationExpires && new Date(dbUser.emailVerificationExpires).getTime() < Date.now()) {
    return res.status(400).send("Ce lien a expiré. Demandez-en un nouveau depuis votre profil.");
  }

  dbUser.emailVerified = true;
  delete dbUser.emailVerificationToken;
  delete dbUser.emailVerificationExpires;
  writeDB(db);

  res.redirect(`${process.env.APP_URL || `http://localhost:${PORT}`}/?emailVerified=1`);
});

// Resend the email verification link (logged-in users only).
app.post("/api/auth/resend-verification-email", writeLimiter, requireAuth, async (req: any, res) => {
  const db = readDB();
  const dbUser = db.users.find((u: any) => u.id === req.user.id);
  if (!dbUser) return res.status(404).json({ error: "Compte introuvable." });
  if (dbUser.emailVerified) return res.status(400).json({ error: "Cette adresse email est déjà vérifiée." });

  const emailVerificationToken = crypto.randomBytes(32).toString("hex");
  dbUser.emailVerificationToken = emailVerificationToken;
  dbUser.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  writeDB(db);

  const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
  const verifyLink = `${appUrl}/api/auth/verify-email?token=${emailVerificationToken}`;
  await sendVerificationEmail(dbUser.email, verifyLink).catch((err) =>
    console.error("Échec d'envoi de l'email de vérification:", err)
  );

  res.json({ ok: true });
});

// Request an SMS OTP code to verify the account's phone number.
app.post("/api/auth/request-phone-otp", writeLimiter, requireAuth, async (req: any, res) => {
  const db = readDB();
  const dbUser = db.users.find((u: any) => u.id === req.user.id);
  if (!dbUser) return res.status(404).json({ error: "Compte introuvable." });
  if (dbUser.phoneVerified) return res.status(400).json({ error: "Ce numéro est déjà vérifié." });
  if (!dbUser.phone) return res.status(400).json({ error: "Aucun numéro de téléphone renseigné." });

  const otp = generateOtp();
  dbUser.phoneOtp = otp;
  dbUser.phoneOtpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  writeDB(db);

  await sendVerificationSms(dbUser.phone, otp).catch((err) =>
    console.error("Échec d'envoi du SMS de vérification:", err)
  );

  res.json({ ok: true });
});

// Confirm the phone number using the OTP code sent above.
app.post("/api/auth/verify-phone-otp", writeLimiter, requireAuth, (req: any, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Veuillez entrer le code reçu par SMS." });

  const db = readDB();
  const dbUser = db.users.find((u: any) => u.id === req.user.id);
  if (!dbUser) return res.status(404).json({ error: "Compte introuvable." });
  if (!dbUser.phoneOtp || !dbUser.phoneOtpExpires) {
    return res.status(400).json({ error: "Demandez d'abord un code de vérification." });
  }
  if (new Date(dbUser.phoneOtpExpires).getTime() < Date.now()) {
    return res.status(400).json({ error: "Ce code a expiré. Demandez-en un nouveau." });
  }
  if (dbUser.phoneOtp !== String(code).trim()) {
    return res.status(400).json({ error: "Code incorrect." });
  }

  dbUser.phoneVerified = true;
  delete dbUser.phoneOtp;
  delete dbUser.phoneOtpExpires;
  writeDB(db);

  res.json(publicUser(dbUser));
});

// Sign in (or sign up) with a Google ID token obtained client-side via
// Google Identity Services. We verify the token's signature/audience
// server-side rather than trusting any user data sent from the client.
const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;
app.post("/api/auth/google", authLimiter, async (req, res) => {
  const { idToken } = req.body;
  if (!idToken || typeof idToken !== "string") {
    return res.status(400).json({ error: "Jeton Google manquant." });
  }
  if (!googleClient) {
    return res.status(503).json({ error: "La connexion Google n'est pas configurée sur ce serveur." });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: "Jeton Google invalide." });
  }
  if (!payload?.email) {
    return res.status(401).json({ error: "Jeton Google invalide." });
  }
  if (!payload.email_verified) {
    return res.status(401).json({ error: "Votre compte Google doit avoir une adresse email vérifiée." });
  }

  const db = readDB();
  const normalizedEmail = payload.email.toLowerCase().trim();
  let dbUser = db.users.find((u: any) => u.email === normalizedEmail);

  if (!dbUser) {
    dbUser = {
      id: `user-${Date.now()}`,
      name: payload.name || normalizedEmail.split("@")[0],
      email: normalizedEmail,
      phone: "",
      wilaya: "",
      passwordHash: null,
      authProvider: "google",
      createdAt: new Date().toISOString(),
      emailVerified: true,
      phoneVerified: false,
      favorites: [],
    };
    db.users.push(dbUser);
    writeDB(db);
  } else if (!dbUser.emailVerified) {
    // Google already verified this email address, so trust it even if the
    // account was originally created with the local email/password flow.
    dbUser.emailVerified = true;
    writeDB(db);
  }

  setSessionCookie(res, dbUser.id);
  res.json(publicUser(dbUser));
});

// Public, non-secret config the frontend needs at runtime (no API keys).
app.get("/api/config", (_req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null });
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

// 1. Get all listings with filter, search, sort & pagination
app.get("/api/listings", (req, res) => {
  const db = readDB();
  let results = [...db.listings];

  const search = req.query.search as string;
  const category = req.query.category as string;
  const wilaya = req.query.wilaya as string;
  const type = req.query.type as string; // 'buy_it_now' | 'auction'
  const filterUser = req.query.sellerEmail as string; // filter by seller
  const transactionMode = req.query.transactionMode as string; // 'sell' | 'buy'
  const minPrice = req.query.minPrice !== undefined ? Number(req.query.minPrice) : undefined;
  const maxPrice = req.query.maxPrice !== undefined ? Number(req.query.maxPrice) : undefined;
  const sort = (req.query.sort as string) || "newest"; // newest | price_asc | price_desc | popular
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 24));

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

  if (Number.isFinite(minPrice)) {
    results = results.filter((item) => item.price >= (minPrice as number));
  }

  if (Number.isFinite(maxPrice)) {
    results = results.filter((item) => item.price <= (maxPrice as number));
  }

  if (sort === "price_asc") {
    results.sort((a, b) => a.price - b.price);
  } else if (sort === "price_desc") {
    results.sort((a, b) => b.price - a.price);
  } else if (sort === "popular") {
    results.sort((a, b) => (b.views || 0) - (a.views || 0));
  } else {
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const total = results.length;
  const start = (page - 1) * pageSize;
  const paged = results.slice(start, start + pageSize);

  res.set("X-Total-Count", String(total));
  res.json(paged.map(withComputedRating));
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

// 2b. Similar listings — same category, excluding the listing itself and
// sold items, ranked by popularity (views) then recency. Lightweight
// "people also viewed"-style recommendation without per-user tracking.
app.get("/api/listings/:id/similar", (req, res) => {
  const db = readDB();
  const listing = db.listings.find((item: any) => item.id === req.params.id);
  if (!listing) {
    return res.status(404).json({ error: "Annonce introuvable" });
  }

  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));
  const similar = db.listings
    .filter((item: any) => item.id !== listing.id && !item.sold && item.category === listing.category)
    .sort((a: any, b: any) => {
      const byViews = (b.views || 0) - (a.views || 0);
      if (byViews !== 0) return byViews;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, limit);

  res.json(similar.map(withComputedRating));
});

// 3. Create listing (requires a logged-in account — seller identity is taken
// from the session, not from the request body, so users can't post as someone else)
app.post("/api/listings", requireAuth, requireVerified, (req: any, res) => {
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
app.post("/api/listings/:id/bids", writeLimiter, requireAuth, async (req: any, res) => {
  const { amount } = req.body;

  if (!amount) {
    return res.status(400).json({ error: "Veuillez indiquer le montant de l'offre." });
  }

  const result = await withDBLock((db) => {
    const listingIndex = db.listings.findIndex((item: any) => item.id === req.params.id);
    if (listingIndex === -1) {
      return { status: 404, body: { error: "Annonce introuvable." } };
    }

    const listing = db.listings[listingIndex];

    if (req.user.email === listing.sellerEmail) {
      return { status: 400, body: { error: "Vous ne pouvez pas enchérir sur votre propre annonce." } };
    }

    if (listing.type !== "auction") {
      return { status: 400, body: { error: "Ce produit n'est pas vendu aux enchères." } };
    }

    if (listing.sold || new Date(listing.auctionEnd).getTime() < Date.now()) {
      return { status: 400, body: { error: "Ces enchères sont terminées." } };
    }

    const bidAmount = Number(amount);
    const currentMaxBid = listing.bids.length > 0
      ? Math.max(...listing.bids.map((b: any) => b.amount))
      : listing.price;

    if (!Number.isFinite(bidAmount) || bidAmount <= currentMaxBid) {
      return {
        status: 400,
        body: { error: `Votre offre doit être supérieure à l'offre actuelle (${currentMaxBid} DA).` },
      };
    }

    const newBid = {
      bidderName: req.user.name,
      bidderPhone: req.user.phone,
      amount: bidAmount,
      timestamp: new Date().toISOString(),
    };

    listing.bids.push(newBid);
    // Sort bids descending
    listing.bids.sort((a: any, b: any) => b.amount - a.amount);

    db.listings[listingIndex] = listing;
    return { status: 200, body: withComputedRating(listing) };
  });

  res.status(result.status).json(result.body);
});

// 5. Simulate Buying/Checkout (single item — kept for the "Acheter maintenant"
// quick-buy flow on the listing detail page; see /api/checkout for cart purchases)
app.post("/api/listings/:id/buy", writeLimiter, requireAuth, async (req: any, res) => {
  const { buyerAddress, wilayaDelivery, deliveryType, quantity } = req.body;
  const buyerName = req.user.name;
  const buyerPhone = req.user.phone;

  if (!buyerAddress) {
    return res.status(400).json({ error: "Veuillez remplir vos informations de livraison." });
  }

  const result = await withDBLock((db) => {
    const listingIndex = db.listings.findIndex((item: any) => item.id === req.params.id);
    if (listingIndex === -1) {
      return { status: 404, body: { error: "Annonce introuvable." } };
    }

    const listing = db.listings[listingIndex];
    if (req.user.email === listing.sellerEmail) {
      return { status: 400, body: { error: "Vous ne pouvez pas acheter votre propre annonce." } };
    }
    if (listing.sold) {
      return { status: 400, body: { error: "Ce produit a déjà été vendu." } };
    }

    const qty = Math.max(1, Number(quantity) || 1);
    const available = typeof listing.quantity === "number" ? listing.quantity : 1;
    if (qty > available) {
      return { status: 400, body: { error: `Stock insuffisant (${available} disponible(s)).` } };
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
    return { status: 200, body: withComputedRating(listing) };
  });

  res.status(result.status).json(result.body);
});

// 5b. Multi-item cart checkout — buys several buy_it_now listings at once.
app.post("/api/checkout", writeLimiter, requireAuth, async (req: any, res) => {
  const { items, buyerAddress, wilayaDelivery, deliveryType } = req.body;
  const buyerName = req.user.name;
  const buyerPhone = req.user.phone;

  if (!buyerAddress) {
    return res.status(400).json({ error: "Veuillez remplir vos informations de livraison." });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Votre panier est vide." });
  }

  const results = await withDBLock((db) => {
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
      if (req.user.email === listing.sellerEmail) {
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

    return results;
  });

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
  const totalSales = sellerListings.filter((l: any) => l.sold).length;
  const memberSince = dbUser?.createdAt || sellerListings[sellerListings.length - 1].createdAt;
  const accountAgeDays = (Date.now() - new Date(memberSince).getTime()) / (1000 * 60 * 60 * 24);
  // "Verified seller" is an in-house trust signal (not a payment/ID check):
  // a track record of completed sales plus a solid average rating.
  const verified = totalSales >= 3 && (ratingCount === 0 || ratingAverage >= 4) && accountAgeDays >= 7;

  res.json({
    name: sellerListings[0].sellerName,
    email,
    wilaya: dbUser?.wilaya || sellerListings[0].wilaya,
    memberSince,
    totalListings: sellerListings.length,
    totalSales,
    ratingAverage,
    ratingCount,
    verified,
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
app.post("/api/listings/:id/messages", writeLimiter, requireAuth, async (req: any, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Le message ne peut pas être vide." });
  }
  if (text.length > 2000) {
    return res.status(400).json({ error: "Le message est trop long (2000 caractères max)." });
  }

  const newMessage = await withDBLock((db) => {
    const message = {
      id: `msg-${Date.now()}`,
      listingId: req.params.id,
      senderName: req.user.name,
      senderPhone: req.user.phone || "",
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };
    db.messages.push(message);
    return message;
  });

  res.status(201).json(newMessage);
});

// 8. Generate description using Gemini
app.post("/api/generate-description", writeLimiter, requireAuth, async (req, res) => {
  const { title, category, condition, details } = req.body;

  if (!title || !category) {
    return res.status(400).json({ error: "Le titre et la catégorie sont obligatoires." });
  }
  if (String(title).length > 200 || String(details || "").length > 1000) {
    return res.status(400).json({ error: "Le titre ou les détails fournis sont trop longs." });
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

  // Periodic sweep so expired auctions close even with no incoming traffic
  // (readDB() already self-heals on every request, this just covers idle periods).
  setInterval(() => {
    withDBLock((db) => closeExpiredAuctions(db)).catch((err) => console.error("Auction sweep error:", err));
  }, 60 * 1000);
}

startServer();
