import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Star, MapPin, CalendarDays, PackageSearch, ShieldCheck, BadgeCheck } from "lucide-react";
import ListingCard from "../components/ListingCard";
import { fetchSellerProfile, type SellerProfile as SellerProfileType } from "../lib/api";
import { useI18n, tWilaya } from "../lib/i18n";

export default function SellerProfile() {
  const { email } = useParams<{ email: string }>();
  const { t, lang } = useI18n();
  const [profile, setProfile] = useState<SellerProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!email) return;
    setLoading(true);
    fetchSellerProfile(email)
      .then(setProfile)
      .catch((err) => setError(err.message || t("seller.notFound")))
      .finally(() => setLoading(false));
  }, [email]);

  if (loading) {
    return <div className="max-w-6xl mx-auto px-4 py-10 text-ink-soft">{t("wishlist.loading")}</div>;
  }

  if (error || !profile) {
    return <div className="max-w-6xl mx-auto px-4 py-16 text-center text-ink-soft">{error || t("seller.notFound")}</div>;
  }

  const memberSinceDate = new Date(profile.memberSince).toLocaleDateString(
    lang === "ar" ? "ar-DZ" : lang === "en" ? "en-US" : "fr-FR",
    { year: "numeric", month: "long" }
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
      <div className="flex flex-wrap items-center gap-4 mb-8 border border-ink/10 rounded-2xl p-5">
        <div className="w-16 h-16 rounded-full bg-primary-light text-primary flex items-center justify-center font-display text-2xl font-bold shrink-0">
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            {profile.name}
            {profile.verified ? (
              <span className="flex items-center gap-1 text-xs font-medium text-primary bg-primary-light px-2 py-0.5 rounded-full">
                <BadgeCheck size={13} /> {t("seller.verifiedBadge")}
              </span>
            ) : (
              <span className="text-xs font-medium text-ink-soft bg-sand-dim px-2 py-0.5 rounded-full">
                {t("seller.badge")}
              </span>
            )}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-ink-soft mt-1">
            <span className="flex items-center gap-1"><MapPin size={14} /> {tWilaya(lang, profile.wilaya)}</span>
            <span className="flex items-center gap-1"><CalendarDays size={14} /> {t("seller.memberSince")} {memberSinceDate}</span>
            <span className="flex items-center gap-1"><PackageSearch size={14} /> {profile.totalListings} {t("seller.totalListings")}</span>
            {profile.totalSales > 0 && (
              <span className="flex items-center gap-1"><ShieldCheck size={14} /> {profile.totalSales} {t("seller.totalSales")}</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-ink-soft mb-1">{t("seller.rating")}</p>
          {profile.ratingCount > 0 ? (
            <span className="flex items-center justify-end gap-1 font-display font-bold text-lg text-ink">
              <Star size={18} className="fill-amber text-amber" /> {profile.ratingAverage}
              <span className="text-sm font-normal text-ink-soft">({profile.ratingCount})</span>
            </span>
          ) : (
            <span className="text-sm text-ink-soft">{t("seller.noRating")}</span>
          )}
        </div>
      </div>

      <h2 className="font-display text-lg font-bold text-ink mb-4">{t("seller.activeListings")}</h2>
      {profile.listings.length === 0 ? (
        <p className="text-ink-soft py-8 text-center border border-dashed border-ink/15 rounded-2xl">
          {t("seller.noListings")}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {profile.listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
