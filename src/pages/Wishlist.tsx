import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { useAuth } from "../lib/auth";
import { fetchFavorites } from "../lib/api";
import ListingCard from "../components/ListingCard";
import { useI18n } from "../lib/i18n";
import type { Listing } from "../types";

export default function Wishlist() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [favorites, setFavorites] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchFavorites()
      .then(setFavorites)
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/connexion" replace />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
      <h1 className="font-display text-2xl font-bold text-ink mb-6">{t("wishlist.title")}</h1>

      {loading ? (
        <p className="text-ink-soft">{t("wishlist.loading")}</p>
      ) : favorites.length === 0 ? (
        <div className="text-center py-12">
          <Heart size={36} className="mx-auto text-ink-soft mb-3" />
          <p className="text-ink-soft">{t("wishlist.empty")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {favorites.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
