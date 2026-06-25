import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Sparkles, ImageIcon, Gavel, ShoppingBag } from "lucide-react";
import { createListing, generateDescription } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useI18n, tCategory, tCondition, tWilaya } from "../lib/i18n";
import { CATEGORIES, WILAYAS, CONDITIONS } from "../types";

export default function PostAd() {
  const { user, loading } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState(CONDITIONS[2]);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [wilaya, setWilaya] = useState(user?.wilaya || WILAYAS[0]);
  const [sellerName, setSellerName] = useState(user?.name || "");
  const [sellerPhone, setSellerPhone] = useState(user?.phone || "");
  const [listingType, setListingType] = useState<"buy_it_now" | "auction">("buy_it_now");
  const [auctionEndDays, setAuctionEndDays] = useState(3);

  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Posting an ad requires a real account now — the server derives the
  // seller's identity from the session rather than trusting form fields.
  if (loading) return null;
  if (!user) return <Navigate to="/connexion" replace />;

  async function handleGenerate() {
    if (!title || !category) {
      setError(t("postad.generateError"));
      return;
    }
    setError("");
    setGenerating(true);
    try {
      const { description: generated } = await generateDescription({ title, category, condition, details: description });
      setDescription(generated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const listing = await createListing({
        title,
        category,
        price: Number(price),
        condition,
        description,
        imageUrl: imageUrl || undefined,
        images: [imageUrl, ...extraImages].filter((u) => u && u.trim()),
        quantity: listingType === "auction" ? 1 : quantity,
        sellerName,
        sellerPhone,
        wilaya,
        type: listingType,
        transactionMode: "sell",
        auctionEndDays: listingType === "auction" ? auctionEndDays : undefined,
      } as any);
      navigate(`/annonce/${listing.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-10">
      <h1 className="font-display text-2xl font-bold text-ink mb-1">{t("postad.title")}</h1>
      <p className="text-sm text-ink-soft mb-7">{t("postad.subtitle")}</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <TypeOption
            icon={ShoppingBag}
            label={t("postad.buyNow")}
            active={listingType === "buy_it_now"}
            onClick={() => setListingType("buy_it_now")}
          />
          <TypeOption
            icon={Gavel}
            label={t("postad.auction")}
            active={listingType === "auction"}
            onClick={() => setListingType("auction")}
          />
        </div>

        <Field label={t("postad.adTitle")} required>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("postad.adTitlePlaceholder")}
            className="w-full h-11 rounded-lg border border-ink/15 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t("postad.category")} required>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-11 rounded-lg border border-ink/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
              {CATEGORIES.map((c) => <option key={c} value={c}>{tCategory(lang, c)}</option>)}
            </select>
          </Field>
          <Field label={t("postad.condition")} required>
            <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full h-11 rounded-lg border border-ink/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
              {CONDITIONS.map((c) => <option key={c} value={c}>{tCondition(lang, c)}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label={listingType === "auction" ? t("postad.startPrice") : t("postad.price")} required>
            <input
              required
              type="number"
              min={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              className="w-full h-11 rounded-lg border border-ink/15 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </Field>
          {listingType === "auction" && (
            <Field label={t("postad.auctionDuration")}>
              <select value={auctionEndDays} onChange={(e) => setAuctionEndDays(Number(e.target.value))} className="w-full h-11 rounded-lg border border-ink/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                <option value={1}>1 {t("postad.day")}</option>
                <option value={3}>3 {t("postad.days")}</option>
                <option value={5}>5 {t("postad.days")}</option>
                <option value={7}>7 {t("postad.days")}</option>
              </select>
            </Field>
          )}
        </div>

        <Field label={t("postad.description")}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            placeholder={t("postad.descriptionPlaceholder")}
            className="w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="mt-2 flex items-center gap-1.5 text-sm font-medium text-amber-dark hover:text-amber transition-colors disabled:opacity-60"
          >
            <Sparkles size={15} /> {generating ? t("postad.generating") : t("postad.generateAI")}
          </button>
        </Field>

        <Field label={t("postad.mainPhoto")}>
          <div className="relative">
            <ImageIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft/50" />
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full h-11 rounded-lg border border-ink/15 pl-10 pr-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </Field>

        <Field label={t("postad.extraPhotos")}>
          <div className="space-y-2">
            {extraImages.map((img, i) => (
              <div key={i} className="relative">
                <ImageIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft/50" />
                <input
                  value={img}
                  onChange={(e) =>
                    setExtraImages((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                  }
                  placeholder="https://..."
                  className="w-full h-11 rounded-lg border border-ink/15 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="button"
                  onClick={() => setExtraImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-rose text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
            {extraImages.length < 6 && (
              <button
                type="button"
                onClick={() => setExtraImages((prev) => [...prev, ""])}
                className="text-sm font-medium text-primary hover:underline"
              >
                {t("postad.addPhoto")}
              </button>
            )}
          </div>
        </Field>

        {listingType === "buy_it_now" && (
          <Field label={t("postad.stockQuantity")} required>
            <input
              required
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="w-full h-11 rounded-lg border border-ink/15 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </Field>
        )}

        <Field label={t("postad.wilaya")} required>
          <select value={wilaya} onChange={(e) => setWilaya(e.target.value)} className="w-full h-11 rounded-lg border border-ink/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
            {WILAYAS.map((w) => <option key={w} value={w}>{tWilaya(lang, w)}</option>)}
          </select>
        </Field>

        <div className="border-t border-ink/10 pt-5">
          <h2 className="font-display font-semibold text-sm text-ink mb-3">{t("postad.contactInfo")}</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("postad.fullName")} required>
              <input required value={sellerName} onChange={(e) => setSellerName(e.target.value)} className="w-full h-11 rounded-lg border border-ink/15 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </Field>
            <Field label={t("postad.phone")} required>
              <input required value={sellerPhone} onChange={(e) => setSellerPhone(e.target.value)} className="w-full h-11 rounded-lg border border-ink/15 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </Field>
          </div>
          <Field label={t("postad.email")}>
            <input
              disabled
              type="email"
              value={user.email}
              className="w-full h-11 rounded-lg border border-ink/15 px-3.5 text-sm bg-sand-dim text-ink-soft cursor-not-allowed"
            />
            <p className="text-xs text-ink-soft mt-1">
              {t("postad.emailNote")}
            </p>
          </Field>
        </div>

        {error && <p className="text-rose text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-12 rounded-full bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors disabled:opacity-60"
        >
          {submitting ? t("postad.publishing") : t("postad.publish")}
        </button>
      </form>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink mb-1.5">
        {label} {required && <span className="text-rose">*</span>}
      </label>
      {children}
    </div>
  );
}

function TypeOption({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Gavel;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 h-12 rounded-xl border-2 font-semibold text-sm transition-colors ${
        active ? "border-primary bg-primary-light text-primary" : "border-ink/10 text-ink-soft hover:border-ink/20"
      }`}
    >
      <Icon size={16} /> {label}
    </button>
  );
}
