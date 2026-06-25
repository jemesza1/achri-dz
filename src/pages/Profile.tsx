import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Plus, Eye, CheckCircle2, RotateCcw, Trash2 } from "lucide-react";
import ListingCard from "../components/ListingCard";
import { fetchListings, updateListing, deleteListing } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useI18n, tWilaya } from "../lib/i18n";
import type { Listing } from "../types";

export default function Profile() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchListings({ sellerEmail: user.email })
      .then(setListings)
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return <Navigate to="/connexion" replace />;

  async function handleToggleSold(listing: Listing) {
    setBusyId(listing.id);
    try {
      const updated = await updateListing(listing.id, { sold: !listing.sold });
      setListings((prev) => prev.map((l) => (l.id === listing.id ? updated : l)));
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(listing: Listing) {
    if (!window.confirm(t("profile.deleteConfirm"))) return;
    setBusyId(listing.id);
    try {
      await deleteListing(listing.id);
      setListings((prev) => prev.filter((l) => l.id !== listing.id));
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-primary-light text-primary flex items-center justify-center font-display text-2xl font-bold">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-ink">{user.name}</h1>
          <p className="text-sm text-ink-soft">{user.email} · {tWilaya(lang, user.wilaya)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-bold text-ink">{t("profile.myListings")}</h2>
        <Link
          to="/vendre"
          className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <Plus size={15} /> {t("profile.newListing")}
        </Link>
      </div>

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] bg-sand-dim rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && listings.length === 0 && (
        <div className="text-center py-16 border border-dashed border-ink/15 rounded-2xl">
          <p className="text-ink-soft mb-2">{t("profile.noListings")}</p>
          <Link to="/vendre" className="text-primary font-medium hover:underline">
            {t("profile.postFirst")}
          </Link>
        </div>
      )}

      {!loading && listings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map((listing) => (
            <div key={listing.id} className="flex flex-col gap-2">
              <ListingCard listing={listing} />
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1 text-ink-soft">
                  <Eye size={13} /> {listing.views || 0} {t("profile.views")}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={busyId === listing.id}
                    onClick={() => handleToggleSold(listing)}
                    className="flex items-center gap-1 font-medium text-primary hover:underline disabled:opacity-50"
                    title={listing.sold ? t("profile.markActive") : t("profile.markSold")}
                  >
                    {listing.sold ? <RotateCcw size={13} /> : <CheckCircle2 size={13} />}
                    {listing.sold ? t("profile.markActive") : t("profile.markSold")}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === listing.id}
                    onClick={() => handleDelete(listing)}
                    className="flex items-center gap-1 font-medium text-red-600 hover:underline disabled:opacity-50"
                    title={t("profile.delete")}
                  >
                    <Trash2 size={13} /> {t("profile.delete")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
