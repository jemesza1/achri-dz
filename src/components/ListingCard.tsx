import { Link } from "react-router-dom";
import { Gavel, MapPin, Eye, Heart, Star, ShoppingCart } from "lucide-react";
import type { Listing } from "../types";
import { formatPrice, auctionCountdown, currentBidAmount, timeAgo } from "../lib/format";
import { useAuth } from "../lib/auth";
import { useCart } from "../lib/cart";
import { toggleFavorite } from "../lib/api";
import { useI18n, tWilaya } from "../lib/i18n";

export default function ListingCard({ listing }: { listing: Listing }) {
  const { user, setUser } = useAuth();
  const { addItem, isInCart } = useCart();
  const { t, lang } = useI18n();
  const isAuction = listing.type === "auction";
  const countdown = isAuction && listing.auctionEnd ? auctionCountdown(listing.auctionEnd) : null;
  const displayPrice = isAuction ? currentBidAmount(listing) : listing.price;
  const isFavorite = !!user?.favorites?.includes(listing.id);
  const canBuy = !isAuction && !listing.sold && (listing.quantity ?? 1) > 0;

  async function handleFavoriteClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    try {
      const updated = await toggleFavorite(listing.id);
      setUser(updated);
    } catch {
      // Silently ignore — non-critical UI action.
    }
  }

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addItem(listing.id, 1);
  }

  return (
    <Link
      to={`/annonce/${listing.id}`}
      className="group flex flex-col bg-white rounded-2xl border border-ink/10 overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-ink/5 transition-all duration-200"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-sand-dim">
        <img
          src={listing.imageUrl}
          alt={listing.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {listing.sold && (
          <div className="absolute inset-0 bg-ink/60 flex items-center justify-center">
            <span className="text-white font-display font-bold text-sm tracking-wide uppercase border-2 border-white px-3 py-1 rounded">
              {t("card.sold")}
            </span>
          </div>
        )}
        {isAuction && !listing.sold && (
          <span className="absolute top-2 left-2 flex items-center gap-1 bg-ink/85 text-white text-xs font-medium px-2 py-1 rounded-full">
            <Gavel size={11} /> {t("card.auction")}
          </span>
        )}
        {user && (
          <button
            onClick={handleFavoriteClick}
            aria-label={isFavorite ? t("nav.favorites") : t("card.addToCart")}
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
          >
            <Heart size={15} className={isFavorite ? "fill-rose text-rose" : "text-ink-soft"} />
          </button>
        )}
      </div>

      <div className="flex flex-col flex-1 p-3.5 gap-1.5">
        <h3 className="text-sm font-medium text-ink leading-snug line-clamp-2 min-h-[2.5rem]">
          {listing.title}
        </h3>

        <div className="price-tag text-lg text-primary mt-0.5">
          {formatPrice(displayPrice)}
        </div>

        {listing.ratingCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-ink-soft">
            <Star size={12} className="fill-amber text-amber" />
            {listing.ratingAverage} <span>({listing.ratingCount})</span>
          </span>
        )}

        {isAuction && countdown && (
          <span className={`text-xs font-medium ${countdown.urgent ? "text-rose" : "text-ink-soft"}`}>
            {countdown.ended ? countdown.label : `⏱ ${countdown.label}`}
          </span>
        )}

        <div className="flex items-center justify-between text-xs text-ink-soft mt-auto pt-2">
          <span className="flex items-center gap-1">
            <MapPin size={12} /> {tWilaya(lang, listing.wilaya)}
          </span>
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Eye size={12} /> {listing.views}
            </span>
            <span>{timeAgo(listing.createdAt)}</span>
          </span>
        </div>

        {canBuy && (
          <button
            onClick={handleAddToCart}
            className="mt-2 h-9 rounded-lg bg-primary-light text-primary font-medium text-xs flex items-center justify-center gap-1.5 hover:bg-primary hover:text-white transition-colors"
          >
            <ShoppingCart size={14} /> {isInCart(listing.id) ? t("card.added") : t("card.addToCart")}
          </button>
        )}
      </div>
    </Link>
  );
}
