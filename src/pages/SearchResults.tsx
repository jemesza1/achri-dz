import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";
import ListingCard from "../components/ListingCard";
import { fetchListings } from "../lib/api";
import { useI18n, tCategory, tWilaya } from "../lib/i18n";
import { CATEGORIES, WILAYAS } from "../types";
import type { Listing } from "../types";

export default function SearchResults() {
  const { t, lang } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<"newest" | "price_asc" | "price_desc">("newest");

  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "Toutes";
  const wilaya = searchParams.get("wilaya") || "Toutes";
  const type = searchParams.get("type") || "Toutes";

  useEffect(() => {
    setLoading(true);
    fetchListings({ search, category, wilaya, type })
      .then(setListings)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [search, category, wilaya, type]);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === "Toutes" || !value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    setSearchParams(params);
  }

  const sorted = [...listings].sort((a, b) => {
    if (sort === "price_asc") return a.price - b.price;
    if (sort === "price_desc") return b.price - a.price;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const activeFilterCount = [category !== "Toutes", wilaya !== "Toutes", type !== "Toutes"].filter(Boolean).length;

  const FilterPanel = (
    <div className="space-y-6">
      <div>
        <h3 className="font-display font-semibold text-sm text-ink mb-2.5">{t("search.category")}</h3>
        <div className="space-y-1">
          <FilterOption
            label={t("search.allCategories")}
            active={category === "Toutes"}
            onClick={() => updateFilter("category", "Toutes")}
          />
          {CATEGORIES.map((cat) => (
            <FilterOption key={cat} label={tCategory(lang, cat)} active={category === cat} onClick={() => updateFilter("category", cat)} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-display font-semibold text-sm text-ink mb-2.5">{t("search.wilaya")}</h3>
        <select
          value={wilaya}
          onChange={(e) => updateFilter("wilaya", e.target.value)}
          className="w-full h-10 rounded-lg border border-ink/15 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="Toutes">{t("search.allWilayas")}</option>
          {WILAYAS.map((w) => (
            <option key={w} value={w}>{tWilaya(lang, w)}</option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="font-display font-semibold text-sm text-ink mb-2.5">{t("search.type")}</h3>
        <div className="space-y-1">
          <FilterOption label={t("search.all")} active={type === "Toutes"} onClick={() => updateFilter("type", "Toutes")} />
          <FilterOption label={t("search.buyNow")} active={type === "buy_it_now"} onClick={() => updateFilter("type", "buy_it_now")} />
          <FilterOption label={t("search.auction")} active={type === "auction"} onClick={() => updateFilter("type", "auction")} />
        </div>
      </div>

      {activeFilterCount > 0 && (
        <button
          onClick={() => setSearchParams(search ? { search } : {})}
          className="text-sm text-rose font-medium hover:underline"
        >
          {t("search.reset")}
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-xl font-bold text-ink">
          {search ? `${t("search.resultsFor")} "${search}"` : category !== "Toutes" ? tCategory(lang, category) : t("search.allListings")}
        </h1>
        <button
          onClick={() => setFiltersOpen(true)}
          className="lg:hidden flex items-center gap-1.5 text-sm font-medium text-ink-soft border border-ink/15 rounded-full px-3 py-1.5"
        >
          <SlidersHorizontal size={14} />
          {t("search.filters")} {activeFilterCount > 0 && `(${activeFilterCount})`}
        </button>
      </div>
      <p className="text-sm text-ink-soft mb-5">{!loading && `${sorted.length} ${t("search.resultsCount")}`}</p>

      <div className="grid lg:grid-cols-[240px_1fr] gap-8">
        <aside className="hidden lg:block">{FilterPanel}</aside>

        {filtersOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-ink/40" onClick={() => setFiltersOpen(false)} />
            <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white p-5 overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-lg">{t("search.filters")}</h2>
                <button onClick={() => setFiltersOpen(false)} aria-label={t("search.close")}>
                  <X size={20} />
                </button>
              </div>
              {FilterPanel}
            </div>
          </div>
        )}

        <div>
          <div className="flex justify-end mb-4">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="h-9 rounded-lg border border-ink/15 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="newest">{t("search.sort.newest")}</option>
              <option value="price_asc">{t("search.sort.priceAsc")}</option>
              <option value="price_desc">{t("search.sort.priceDesc")}</option>
            </select>
          </div>

          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] bg-sand-dim rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {error && <p className="text-rose text-sm">{error}</p>}

          {!loading && !error && sorted.length === 0 && (
            <div className="text-center py-16 border border-dashed border-ink/15 rounded-2xl">
              <p className="text-ink-soft">{t("search.noResults")}</p>
            </div>
          )}

          {!loading && !error && sorted.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {sorted.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors ${
        active ? "bg-primary-light text-primary font-medium" : "text-ink-soft hover:bg-sand-dim"
      }`}
    >
      {label}
    </button>
  );
}
