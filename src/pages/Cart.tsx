import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, ShoppingCart, CheckCircle2, ShieldCheck } from "lucide-react";
import { useCart } from "../lib/cart";
import { useAuth } from "../lib/auth";
import { fetchListing, checkout, type CheckoutResult } from "../lib/api";
import { formatPrice } from "../lib/format";
import { useI18n } from "../lib/i18n";
import type { Listing } from "../types";

export default function Cart() {
  const { items, setQuantity, removeItem, clear } = useCart();
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [listings, setListings] = useState<Record<string, Listing>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [buyerAddress, setBuyerAddress] = useState("");
  const [wilayaDelivery, setWilayaDelivery] = useState(user?.wilaya || "");
  const [deliveryType, setDeliveryType] = useState("domicile");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<CheckoutResult[] | null>(null);

  useEffect(() => {
    Promise.all(items.map((i) => fetchListing(i.listingId).catch(() => null)))
      .then((fetched) => {
        const map: Record<string, Listing> = {};
        fetched.forEach((l) => {
          if (l) map[l.id] = l;
        });
        setListings(map);
      })
      .finally(() => setLoading(false));
  }, [items]);

  const total = items.reduce((sum, i) => {
    const listing = listings[i.listingId];
    return listing ? sum + listing.price * i.quantity : sum;
  }, 0);

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { results: r } = await checkout({
        items: items.map((i) => ({ listingId: i.listingId, quantity: i.quantity })),
        buyerAddress,
        wilayaDelivery,
        deliveryType,
      });
      setResults(r);
      const succeeded = r.filter((res) => res.success).map((res) => res.listingId);
      succeeded.forEach((id) => removeItem(id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-10 text-ink-soft">{t("cart.loading")}</div>;
  }

  if (items.length === 0 && !results) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <ShoppingCart size={36} className="mx-auto text-ink-soft mb-3" />
        <p className="text-ink-soft mb-4">{t("cart.empty")}</p>
        <Link to="/" className="text-primary font-medium hover:underline">{t("cart.continueShopping")}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-10">
      <h1 className="font-display text-2xl font-bold text-ink mb-6">{t("cart.title")}</h1>

      {results && (
        <div className="mb-6 space-y-2">
          {results.map((r) => (
            <p key={r.listingId} className={`text-sm flex items-center gap-1.5 ${r.success ? "text-primary" : "text-rose"}`}>
              {r.success ? <CheckCircle2 size={15} /> : null}
              {r.success
                ? `${listings[r.listingId]?.title || t("cart.item")} — ${t("cart.orderConfirmed")}`
                : `${listings[r.listingId]?.title || t("cart.item")} — ${r.error}`}
            </p>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="space-y-3 mb-6">
            {items.map((item) => {
              const listing = listings[item.listingId];
              if (!listing) return null;
              return (
                <div key={item.listingId} className="flex items-center gap-3 border border-ink/10 rounded-xl p-3">
                  <Link to={`/annonce/${listing.id}`} className="shrink-0">
                    <img src={listing.imageUrl} alt={listing.title} className="w-16 h-16 rounded-lg object-cover" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/annonce/${listing.id}`} className="text-sm font-medium text-ink hover:underline line-clamp-1">
                      {listing.title}
                    </Link>
                    <p className="price-tag text-sm text-primary mt-0.5">{formatPrice(listing.price)}</p>
                  </div>
                  <div className="flex items-center border border-ink/15 rounded-lg h-9">
                    <button
                      onClick={() => setQuantity(item.listingId, item.quantity - 1)}
                      className="w-8 h-full text-ink-soft hover:text-ink"
                    >
                      −
                    </button>
                    <span className="w-7 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => setQuantity(item.listingId, Math.min(listing.quantity ?? 1, item.quantity + 1))}
                      className="w-8 h-full text-ink-soft hover:text-ink"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.listingId)}
                    aria-label="Retirer"
                    className="text-ink-soft hover:text-rose transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-ink/10 pt-4 mb-6">
            <span className="font-medium text-ink">{t("cart.total")}</span>
            <span className="price-tag text-xl text-primary">{formatPrice(total)}</span>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-ink-soft mb-4">
            <ShieldCheck size={13} className="text-primary shrink-0" /> {t("trust.banner")}
          </p>

          {user ? (
            <form onSubmit={handleCheckout} className="border border-ink/10 rounded-2xl p-5 space-y-3">
              <h2 className="font-display font-semibold text-sm text-ink mb-1">{t("cart.deliveryInfo")}</h2>
              <input required placeholder={t("buy.deliveryAddress")} value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} className="w-full h-10 rounded-lg border border-ink/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder={t("buy.wilayaDelivery")} value={wilayaDelivery} onChange={(e) => setWilayaDelivery(e.target.value)} className="h-10 rounded-lg border border-ink/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)} className="h-10 rounded-lg border border-ink/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="domicile">{t("buy.deliveryHome")}</option>
                  <option value="point_relais">{t("buy.deliveryPickup")}</option>
                </select>
              </div>

              {error && <p className="text-rose text-sm">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-60"
              >
                {submitting ? t("buy.confirming") : `${t("cart.order")} (${formatPrice(total)})`}
              </button>
            </form>
          ) : (
            <p className="text-sm text-ink-soft border border-ink/10 rounded-2xl p-5">
              <Link to="/connexion" className="text-primary font-medium hover:underline">{t("detail.loginToReview")}</Link> {t("detail.loginToReviewSuffix")}
            </p>
          )}

          <button onClick={() => { clear(); navigate("/"); }} className="text-sm text-ink-soft hover:underline mt-4">
            {t("cart.clear")}
          </button>
        </>
      )}
    </div>
  );
}
