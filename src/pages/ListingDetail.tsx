import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { MapPin, Eye, Clock, ShieldCheck, Phone, Send, Gavel, ShoppingBag, CheckCircle2, Heart, Star, ShoppingCart } from "lucide-react";
import type { Listing, Message } from "../types";
import { fetchListing, placeBid, buyListing, fetchMessages, postMessage, toggleFavorite, submitReview } from "../lib/api";
import { formatPrice, timeAgo, auctionCountdown, currentBidAmount } from "../lib/format";
import { useAuth } from "../lib/auth";
import { useCart } from "../lib/cart";
import { useI18n, tCategory, tCondition, tWilaya } from "../lib/i18n";

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { addItem, isInCart } = useCart();
  const { t, lang } = useI18n();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const load = useCallback(() => {
    if (!id) return;
    fetchListing(id)
      .then(setListing)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-8">
        <div className="aspect-square bg-sand-dim rounded-2xl animate-pulse" />
        <div className="space-y-4">
          <div className="h-7 bg-sand-dim rounded-lg w-3/4 animate-pulse" />
          <div className="h-10 bg-sand-dim rounded-lg w-1/3 animate-pulse" />
          <div className="h-32 bg-sand-dim rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-ink-soft mb-4">{error || t("detail.notFound")}</p>
        <Link to="/" className="text-primary font-medium hover:underline">{t("detail.backHome")}</Link>
      </div>
    );
  }

  const isAuction = listing.type === "auction";
  const countdown = isAuction && listing.auctionEnd ? auctionCountdown(listing.auctionEnd) : null;
  const displayPrice = isAuction ? currentBidAmount(listing) : listing.price;
  const isOwner = user?.email === listing.sellerEmail;
  const isFavorite = !!user?.favorites?.includes(listing.id);
  const gallery = listing.images && listing.images.length > 0 ? listing.images : [listing.imageUrl];
  const stock = listing.quantity ?? 1;
  const canAddToCart = !isAuction && !listing.sold && !isOwner && stock > 0;

  async function handleToggleFavorite() {
    if (!user) {
      navigate("/connexion");
      return;
    }
    try {
      const updated = await toggleFavorite(listing.id);
      setUser(updated);
    } catch (err: any) {
      setActionError(err.message);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-sand-dim border border-ink/10 relative">
            <img src={gallery[activeImage] || listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
            {listing.sold && (
              <div className="absolute inset-0 bg-ink/60 flex items-center justify-center">
                <span className="text-white font-display font-bold text-lg tracking-wide uppercase border-2 border-white px-4 py-1.5 rounded">
                  {t("card.sold")}
                </span>
              </div>
            )}
            <button
              onClick={handleToggleFavorite}
              aria-label={isFavorite ? t("nav.favorites") : t("card.addToCart")}
              className="absolute top-3 right-3 h-10 w-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
            >
              <Heart size={18} className={isFavorite ? "fill-rose text-rose" : "text-ink-soft"} />
            </button>
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {gallery.map((img, i) => (
                <button
                  key={img + i}
                  onClick={() => setActiveImage(i)}
                  className={`shrink-0 h-16 w-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === activeImage ? "border-primary" : "border-transparent"
                  }`}
                >
                  <img src={img} alt={`${listing.title} ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <div className="flex items-center gap-2 text-xs text-ink-soft mb-2">
              <span className="bg-sand-dim px-2 py-0.5 rounded-full">{tCategory(lang, listing.category)}</span>
              <span className="flex items-center gap-1"><MapPin size={11} /> {tWilaya(lang, listing.wilaya)}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink leading-tight">{listing.title}</h1>
            <div className="flex items-center gap-3 text-xs text-ink-soft mt-2">
              {listing.ratingCount > 0 && (
                <span className="flex items-center gap-1 text-amber-dark font-medium">
                  <Star size={12} className="fill-amber text-amber" /> {listing.ratingAverage} ({listing.ratingCount} {t("detail.reviews").toLowerCase()})
                </span>
              )}
              <span className="flex items-center gap-1"><Eye size={12} /> {listing.views}</span>
              <span className="flex items-center gap-1"><Clock size={12} /> {timeAgo(listing.createdAt)}</span>
              <span>{tCondition(lang, listing.condition)}</span>
            </div>
          </div>

          <div className="bg-sand-dim rounded-2xl p-5">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs text-ink-soft block mb-0.5">
                  {isAuction ? t("detail.currentBid") : t("detail.price")}
                </span>
                <span className="price-tag text-3xl text-primary">{formatPrice(displayPrice)}</span>
              </div>
              {isAuction && countdown && (
                <span className={`text-sm font-semibold flex items-center gap-1 ${countdown.urgent ? "text-rose" : "text-ink-soft"}`}>
                  <Clock size={14} /> {countdown.label}
                </span>
              )}
            </div>

            {isAuction && listing.bids.length > 0 && (
              <p className="text-xs text-ink-soft mt-2">{listing.bids.length} {t("detail.bidsReceived")}</p>
            )}

            {!isAuction && (
              <p className="text-xs text-ink-soft mt-2">
                {stock > 0 ? `${stock} ${t("detail.inStock")}` : t("detail.outOfStock")}
              </p>
            )}

            {actionError && <p className="text-rose text-sm mt-3">{actionError}</p>}
            {actionSuccess && (
              <p className="text-primary text-sm mt-3 flex items-center gap-1.5 font-medium">
                <CheckCircle2 size={15} /> {actionSuccess}
              </p>
            )}

            {!listing.sold && !isOwner && (
              <div className="mt-4">
                {isAuction ? (
                  !countdown?.ended && (
                    <BidForm
                      currentBid={displayPrice}
                      onSubmit={async (bidderName, bidderPhone, amount) => {
                        setActionError("");
                        try {
                          const updated = await placeBid(listing.id, { bidderName, bidderPhone, amount });
                          setListing(updated);
                          setActionSuccess(t("detail.bidPlaced"));
                        } catch (err: any) {
                          setActionError(err.message);
                        }
                      }}
                    />
                  )
                ) : (
                  <div className="space-y-3">
                    {canAddToCart && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-ink/15 rounded-lg h-10">
                          <button
                            type="button"
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            className="w-9 h-full text-ink-soft hover:text-ink"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
                            className="w-9 h-full text-ink-soft hover:text-ink"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            addItem(listing.id, quantity);
                            setActionSuccess(t("detail.addedToCart"));
                          }}
                          className="flex-1 h-10 rounded-lg bg-primary-light text-primary font-semibold text-sm flex items-center justify-center gap-1.5 hover:bg-primary hover:text-white transition-colors"
                        >
                          <ShoppingCart size={15} /> {isInCart(listing.id) ? t("card.added") : t("card.addToCart")}
                        </button>
                      </div>
                    )}
                    <BuyForm
                      maxQuantity={stock}
                      onSubmit={async (data) => {
                        setActionError("");
                        try {
                          const updated = await buyListing(listing.id, data);
                          setListing(updated);
                          setActionSuccess(t("detail.purchaseConfirmed"));
                        } catch (err: any) {
                          setActionError(err.message);
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {isOwner && !listing.sold && (
              <p className="text-sm text-ink-soft mt-3 italic">{t("detail.ownListing")}</p>
            )}
          </div>

          <SellerCard listing={listing} />

          {!isOwner && <MessagingSection listingId={listing.id} />}
        </div>
      </div>

      {listing.description && (
        <div className="mt-10 max-w-3xl">
          <h2 className="font-display text-lg font-bold text-ink mb-3">{t("detail.description")}</h2>
          <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-line">{listing.description}</p>
        </div>
      )}

      <ReviewsSection
        listing={listing}
        onSubmit={async (rating, comment) => {
          setActionError("");
          try {
            const updated = await submitReview(listing.id, { rating, comment });
            setListing(updated);
          } catch (err: any) {
            setActionError(err.message);
          }
        }}
      />
    </div>
  );
}

function ReviewsSection({
  listing,
  onSubmit,
}: {
  listing: Listing;
  onSubmit: (rating: number, comment: string) => Promise<void>;
}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reviews = listing.reviews || [];
  const myReview = user ? reviews.find((r) => r.reviewerEmail === user.email) : undefined;

  return (
    <div className="mt-10 max-w-3xl">
      <h2 className="font-display text-lg font-bold text-ink mb-3 flex items-center gap-2">
        {t("detail.reviews")}
        {listing.ratingCount > 0 && (
          <span className="text-sm font-normal text-ink-soft flex items-center gap-1">
            <Star size={14} className="fill-amber text-amber" /> {listing.ratingAverage} · {listing.ratingCount} {t("detail.reviews").toLowerCase()}
          </span>
        )}
      </h2>

      {reviews.length > 0 ? (
        <div className="space-y-3 mb-5">
          {reviews.map((r) => (
            <div key={r.id} className="border border-ink/10 rounded-xl p-3.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-ink">{r.reviewerName}</span>
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={13} className={i < r.rating ? "fill-amber text-amber" : "text-ink/15"} />
                  ))}
                </span>
              </div>
              {r.comment && <p className="text-sm text-ink-soft mt-1.5">{r.comment}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-soft mb-5">{t("detail.noReviews")}</p>
      )}

      {user ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true);
            await onSubmit(rating, comment);
            setSubmitting(false);
            setComment("");
          }}
          className="border border-ink/10 rounded-xl p-4 space-y-2.5"
        >
          <p className="text-sm font-medium text-ink">{myReview ? t("detail.editReview") : t("detail.leaveReview")}</p>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <button key={i} type="button" onClick={() => setRating(i + 1)} aria-label={`${i + 1}`}>
                <Star size={20} className={i < rating ? "fill-amber text-amber" : "text-ink/20"} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("detail.commentPlaceholder")}
            rows={3}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
          <button
            type="submit"
            disabled={submitting}
            className="h-10 px-5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-60"
          >
            {submitting ? t("detail.sending") : myReview ? t("detail.update") : t("detail.publish")}
          </button>
        </form>
      ) : (
        <p className="text-sm text-ink-soft">
          <Link to="/connexion" className="text-primary font-medium hover:underline">{t("detail.loginToReview")}</Link> {t("detail.loginToReviewSuffix")}
        </p>
      )}
    </div>
  );
}

function SellerCard({ listing }: { listing: Listing }) {
  const { t } = useI18n();
  return (
    <div className="border border-ink/10 rounded-2xl p-4 flex items-center gap-3">
      <Link
        to={`/vendeur/${encodeURIComponent(listing.sellerEmail)}`}
        className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
      >
        <div className="w-11 h-11 rounded-full bg-primary-light text-primary flex items-center justify-center font-display font-bold shrink-0">
          {listing.sellerName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-ink truncate hover:underline">{listing.sellerName}</p>
          <p className="text-xs text-ink-soft flex items-center gap-1"><ShieldCheck size={11} /> {t("detail.sellerBadge")}</p>
        </div>
      </Link>
      <a
        href={`tel:${listing.sellerPhone}`}
        className="flex items-center gap-1.5 text-sm font-medium text-primary border border-primary/30 rounded-full px-3 py-1.5 hover:bg-primary-light transition-colors shrink-0"
      >
        <Phone size={14} /> {t("detail.call")}
      </a>
    </div>
  );
}

function BidForm({
  currentBid,
  onSubmit,
}: {
  currentBid: number;
  onSubmit: (name: string, phone: string, amount: number) => Promise<void>;
}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [amount, setAmount] = useState(currentBid + 500);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSubmitting(true);
        await onSubmit(name, phone, amount);
        setSubmitting(false);
      }}
      className="space-y-2.5"
    >
      <div className="grid grid-cols-2 gap-2.5">
        <input
          required
          placeholder={t("detail.yourName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10 rounded-lg border border-ink/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <input
          required
          placeholder={t("bid.phone")}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="h-10 rounded-lg border border-ink/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <div className="flex gap-2.5">
        <input
          required
          type="number"
          min={currentBid + 1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="h-10 flex-1 rounded-lg border border-ink/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="submit"
          disabled={submitting}
          className="h-10 px-5 rounded-lg bg-amber text-ink font-semibold text-sm flex items-center gap-1.5 hover:bg-amber-dark hover:text-white transition-colors disabled:opacity-60"
        >
          <Gavel size={15} /> {submitting ? t("bid.submitting") : t("bid.place")}
        </button>
      </div>
    </form>
  );
}

function BuyForm({
  maxQuantity,
  onSubmit,
}: {
  maxQuantity: number;
  onSubmit: (data: { buyerName: string; buyerPhone: string; buyerAddress: string; wilayaDelivery: string; deliveryType: string; quantity: number }) => Promise<void>;
}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [buyerName, setBuyerName] = useState(user?.name || "");
  const [buyerPhone, setBuyerPhone] = useState(user?.phone || "");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [wilayaDelivery, setWilayaDelivery] = useState(user?.wilaya || "");
  const [deliveryType, setDeliveryType] = useState("domicile");
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full h-11 rounded-lg bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors"
      >
        <ShoppingBag size={16} /> {t("buy.now")}
      </button>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSubmitting(true);
        await onSubmit({ buyerName, buyerPhone, buyerAddress, wilayaDelivery, deliveryType, quantity });
        setSubmitting(false);
      }}
      className="space-y-2.5"
    >
      <div className="grid grid-cols-2 gap-2.5">
        <input required placeholder={t("detail.yourName")} value={buyerName} onChange={(e) => setBuyerName(e.target.value)} className="h-10 rounded-lg border border-ink/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
        <input required placeholder={t("login.phone")} value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} className="h-10 rounded-lg border border-ink/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
      </div>
      <input required placeholder={t("buy.deliveryAddress")} value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} className="w-full h-10 rounded-lg border border-ink/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
      <div className="grid grid-cols-2 gap-2.5">
        <input placeholder={t("buy.wilayaDelivery")} value={wilayaDelivery} onChange={(e) => setWilayaDelivery(e.target.value)} className="h-10 rounded-lg border border-ink/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
        <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)} className="h-10 rounded-lg border border-ink/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
          <option value="domicile">{t("buy.deliveryHome")}</option>
          <option value="point_relais">{t("buy.deliveryPickup")}</option>
        </select>
      </div>
      {maxQuantity > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-ink-soft">{t("buy.quantity")}</label>
          <input
            type="number"
            min={1}
            max={maxQuantity}
            value={quantity}
            onChange={(e) => setQuantity(Math.min(maxQuantity, Math.max(1, Number(e.target.value))))}
            className="h-9 w-20 rounded-lg border border-ink/15 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full h-11 rounded-lg bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors disabled:opacity-60"
      >
        {submitting ? t("buy.confirming") : t("buy.confirm")}
      </button>
    </form>
  );
}

function MessagingSection({ listingId }: { listingId: string }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchMessages(listingId).then((m) => { setMessages(m); setLoaded(true); }).catch(() => setLoaded(true));
  }, [listingId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !name.trim()) return;
    setSending(true);
    try {
      const msg = await postMessage(listingId, { senderName: name, senderPhone: phone, text: text.trim() });
      setMessages((prev) => [...prev, msg]);
      setText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border border-ink/10 rounded-2xl p-4">
      <h3 className="font-display font-semibold text-sm text-ink mb-3 flex items-center gap-1.5">
        <Send size={14} /> {t("detail.contactSeller")}
      </h3>

      {loaded && messages.length > 0 && (
        <div className="space-y-2 mb-3 max-h-40 overflow-y-auto pr-1">
          {messages.map((m) => (
            <div key={m.id} className="bg-sand-dim rounded-lg px-3 py-2 text-sm">
              <span className="font-medium text-ink">{m.senderName}</span>
              <span className="text-ink-soft"> — {m.text}</span>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSend} className="space-y-2">
        {!user && (
          <div className="grid grid-cols-2 gap-2">
            <input required placeholder={t("detail.yourName")} value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-lg border border-ink/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            <input placeholder={t("detail.phoneOptional")} value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9 rounded-lg border border-ink/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        )}
        <div className="flex gap-2">
          <input
            required
            placeholder={t("detail.yourMessage")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 h-9 rounded-lg border border-ink/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit"
            disabled={sending}
            className="h-9 px-4 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60"
          >
            {t("detail.send")}
          </button>
        </div>
      </form>
    </div>
  );
}
