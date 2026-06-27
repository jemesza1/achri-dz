import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Truck, MessageCircle } from "lucide-react";
import ListingCard from "../components/ListingCard";
import { fetchListings } from "../lib/api";
import { getCategoryIcon } from "../lib/categoryIcons";
import { useI18n, tCategory } from "../lib/i18n";
import { CATEGORIES } from "../types";
import type { Listing } from "../types";

export default function Home() {
  const { t, lang } = useI18n();
  const [listings, setListings] = useState<Listing[]>([]);
  const [trending, setTrending] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchListings()
      .then(setListings)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    fetchListings({ sort: "popular" }).then(setTrending).catch(() => setTrending([]));
  }, []);

  const featured = listings.filter((l) => !l.sold).slice(0, 8);
  const auctions = listings.filter((l) => l.type === "auction" && !l.sold).slice(0, 4);
  const trendingListings = trending.filter((l) => !l.sold && l.views > 0).slice(0, 4);

  const features = [
    { icon: ShieldCheck, title: t("home.feature.verified.title"), text: t("home.feature.verified.text") },
    { icon: Truck, title: t("home.feature.delivery.title"), text: t("home.feature.delivery.text") },
    { icon: MessageCircle, title: t("home.feature.messaging.title"), text: t("home.feature.messaging.text") },
  ];

  return (
    <div>
      <section className="bg-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: "radial-gradient(circle, white 1.5px, transparent 1.5px)",
          backgroundSize: "24px 24px",
        }} />
        <div className="max-w-7xl mx-auto px-4 py-14 sm:py-20 relative">
          <div className="max-w-xl">
            <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-white leading-[1.1] tracking-tight">
              {t("home.hero.title")}
            </h1>
            <p className="text-primary-light/90 text-base sm:text-lg mt-4 leading-relaxed">
              {t("home.hero.subtitle")}
            </p>
            <div className="flex flex-wrap gap-3 mt-7">
              <Link
                to="/recherche"
                className="h-12 px-6 rounded-full bg-amber text-ink font-semibold flex items-center gap-2 hover:bg-amber-dark hover:text-white transition-colors"
              >
                {t("home.hero.explore")} <ArrowRight size={18} />
              </Link>
              <Link
                to="/vendre"
                className="h-12 px-6 rounded-full bg-white/10 text-white font-semibold border border-white/30 flex items-center gap-2 hover:bg-white/20 transition-colors"
              >
                {t("home.hero.sellFree")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 -mt-px relative">
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-9 gap-2 sm:gap-3 -translate-y-6 sm:-translate-y-8">
          {CATEGORIES.map((cat) => {
            const Icon = getCategoryIcon(cat);
            return (
              <Link
                key={cat}
                to={`/recherche?category=${encodeURIComponent(cat)}`}
                className="flex flex-col items-center gap-2 bg-white rounded-2xl border border-ink/10 p-3 sm:p-4 hover:border-primary/40 hover:shadow-md transition-all text-center"
              >
                <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-primary">
                  <Icon size={20} strokeWidth={2} />
                </div>
                <span className="text-[11px] sm:text-xs font-medium text-ink-soft leading-tight">{tCategory(lang, cat)}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8 grid sm:grid-cols-3 gap-4">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-start gap-3 p-1">
            <div className="w-9 h-9 rounded-lg bg-amber/15 text-amber-dark flex items-center justify-center shrink-0">
              <Icon size={18} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm text-ink">{title}</h3>
              <p className="text-xs text-ink-soft mt-0.5">{text}</p>
            </div>
          </div>
        ))}
      </section>

      {trendingListings.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-ink">{t("home.trending.title")}</h2>
            <Link to="/recherche?sort=popular" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              {t("home.seeAll")} <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {trendingListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {auctions.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-ink">{t("home.auctions.title")}</h2>
            <Link to="/recherche?type=auction" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              {t("home.seeAll")} <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {auctions.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-ink">{t("home.recent.title")}</h2>
          <Link to="/recherche" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
            {t("home.seeAll")} <ArrowRight size={14} />
          </Link>
        </div>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] bg-sand-dim rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <p className="text-rose text-sm">{t("home.loadError")} : {error}</p>
        )}

        {!loading && !error && featured.length === 0 && (
          <div className="text-center py-16 border border-dashed border-ink/15 rounded-2xl">
            <p className="text-ink-soft">{t("home.empty.title")}</p>
            <Link to="/vendre" className="text-primary font-medium hover:underline mt-1 inline-block">
              {t("home.empty.cta")}
            </Link>
          </div>
        )}

        {!loading && !error && featured.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {featured.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
