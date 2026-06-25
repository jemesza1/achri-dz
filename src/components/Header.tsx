import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search, Plus, User, LogOut, Menu, X, ShoppingCart, Heart, Globe } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useCart } from "../lib/cart";
import { useI18n, tCategory, type Lang } from "../lib/i18n";
import { CATEGORIES } from "../types";

const LANG_LABELS: Record<Lang, string> = { fr: "FR", en: "EN", ar: "AR" };
const LANG_NAMES: Record<Lang, string> = { fr: "Français", en: "English", ar: "العربية" };

export default function Header() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("search") || "");
  const [menuOpen, setMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    navigate(`/recherche?${params.toString()}`);
  }

  return (
    <header className="sticky top-0 z-50 bg-sand/95 backdrop-blur-sm border-b border-ink/10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-4 h-16">
          <Link to="/" className="flex items-center gap-1.5 shrink-0 group" aria-label="Achri DZ - Algeria Marketplace">
            <span className="font-display text-2xl font-extrabold tracking-tight text-primary">
              Achri
            </span>
            <span className="font-display text-2xl font-extrabold tracking-tight text-amber-dark">
              DZ
            </span>
            <span className="hidden lg:inline text-[11px] font-semibold text-ink-soft/70 -ml-0.5 mt-1.5 tracking-wide uppercase">
              Algeria Marketplace
            </span>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden sm:flex">
            <div className="relative w-full">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search.placeholder")}
                className="w-full h-11 rounded-full border border-ink/15 bg-white pl-5 pr-12 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-shadow"
              />
              <button
                type="submit"
                aria-label={t("search.button")}
                className="absolute right-1.5 top-1.5 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-colors"
              >
                <Search size={16} />
              </button>
            </div>
          </form>

          <div className="hidden md:flex items-center gap-2 ml-auto shrink-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangMenuOpen((v) => !v)}
                aria-label={t("nav.language")}
                className="h-10 px-3 rounded-full text-ink-soft hover:bg-ink/5 transition-colors flex items-center gap-1.5 text-sm font-medium"
              >
                <Globe size={16} /> {LANG_LABELS[lang]}
              </button>
              {langMenuOpen && (
                <div className="absolute right-0 mt-1 w-36 rounded-xl border border-ink/10 bg-white shadow-lg py-1 z-50">
                  {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => { setLang(l); setLangMenuOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-sand-dim transition-colors ${l === lang ? "font-semibold text-primary" : "text-ink"}`}
                    >
                      {LANG_NAMES[l]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link
              to="/vendre"
              className="flex items-center gap-1.5 h-10 px-4 rounded-full bg-amber text-ink font-semibold text-sm hover:bg-amber-dark hover:text-white transition-colors"
            >
              <Plus size={16} strokeWidth={2.5} />
              {t("nav.sell")}
            </Link>

            {user && (
              <Link
                to="/favoris"
                aria-label={t("nav.favorites")}
                className="h-10 w-10 rounded-full text-ink-soft hover:bg-ink/5 transition-colors flex items-center justify-center"
              >
                <Heart size={18} />
              </Link>
            )}

            <Link
              to="/panier"
              aria-label={t("nav.cart")}
              className="relative h-10 w-10 rounded-full text-ink-soft hover:bg-ink/5 transition-colors flex items-center justify-center"
            >
              <ShoppingCart size={18} />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/profil"
                  className="flex items-center gap-1.5 h-10 px-3 rounded-full text-ink-soft hover:bg-ink/5 transition-colors text-sm font-medium"
                >
                  <User size={16} />
                  {user.name.split(" ")[0]}
                </Link>
                <button
                  onClick={logout}
                  aria-label={t("nav.logout")}
                  className="h-10 w-10 rounded-full text-ink-soft hover:bg-ink/5 transition-colors flex items-center justify-center"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <Link
                to="/connexion"
                className="h-10 px-4 rounded-full text-ink font-medium text-sm hover:bg-ink/5 transition-colors flex items-center"
              >
                {t("nav.login")}
              </Link>
            )}
          </div>

          <button
            className="md:hidden ml-auto h-10 w-10 flex items-center justify-center text-ink"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={t("nav.menu")}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <form onSubmit={handleSearch} className="pb-3 sm:hidden">
          <div className="relative w-full">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search.placeholder.short")}
              className="w-full h-10 rounded-full border border-ink/15 bg-white pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              aria-label={t("search.button")}
              className="absolute right-1 top-1 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center"
            >
              <Search size={15} />
            </button>
          </div>
        </form>

        <nav className="hidden lg:flex items-center gap-1 h-11 -mt-1 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              to={`/recherche?category=${encodeURIComponent(cat)}`}
              className="px-3 py-1.5 rounded-full text-sm text-ink-soft hover:text-primary hover:bg-primary-light whitespace-nowrap transition-colors"
            >
              {tCategory(lang, cat)}
            </Link>
          ))}
        </nav>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-ink/10 bg-white px-4 py-3 space-y-1">
          <div className="flex items-center gap-2 py-2">
            <Globe size={16} className="text-ink-soft" />
            {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${l === lang ? "border-primary text-primary bg-primary-light" : "border-ink/15 text-ink-soft"}`}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
          <Link
            to="/vendre"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 py-2.5 text-ink font-semibold"
          >
            <Plus size={18} /> {t("nav.sell")}
          </Link>
          <Link
            to="/panier"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 py-2.5 text-ink"
          >
            <ShoppingCart size={18} /> {t("nav.cart")} {count > 0 && `(${count})`}
          </Link>
          {user ? (
            <>
              <Link to="/favoris" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 py-2.5 text-ink">
                <Heart size={18} /> {t("nav.favorites")}
              </Link>
              <Link to="/profil" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 py-2.5 text-ink">
                <User size={18} /> {t("nav.profile")}
              </Link>
              <button
                onClick={() => { logout(); setMenuOpen(false); }}
                className="flex items-center gap-2 py-2.5 text-ink-soft w-full text-left"
              >
                <LogOut size={18} /> {t("nav.logout")}
              </button>
            </>
          ) : (
            <Link to="/connexion" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 py-2.5 text-ink">
              <User size={18} /> {t("nav.login")}
            </Link>
          )}
          <div className="pt-2 border-t border-ink/10">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                to={`/recherche?category=${encodeURIComponent(cat)}`}
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-sm text-ink-soft"
              >
                {tCategory(lang, cat)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
