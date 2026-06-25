import { Link } from "react-router-dom";
import { useI18n, tCategory } from "../lib/i18n";

export default function Footer() {
  const { t, lang } = useI18n();
  return (
    <footer className="border-t border-ink/10 bg-white mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-2 sm:grid-cols-5 gap-8">
        <div className="col-span-2 sm:col-span-1">
          <div className="flex items-baseline gap-1 mb-1">
            <span className="font-display text-xl font-extrabold text-primary">Achri</span>
            <span className="font-display text-xl font-extrabold text-amber-dark">DZ</span>
          </div>
          <p className="text-[11px] font-semibold text-ink-soft/70 uppercase tracking-wide mb-3">
            {t("app.subtitle")}
          </p>
          <p className="text-sm text-ink-soft leading-relaxed">
            {t("app.tagline")}
          </p>
        </div>
        <div>
          <h3 className="font-display font-semibold text-sm mb-3 text-ink">{t("footer.section.brand")}</h3>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li><Link to="/" className="hover:text-primary">{t("footer.link.home")}</Link></li>
            <li><Link to="/vendre" className="hover:text-primary">{t("footer.link.sell")}</Link></li>
            <li><Link to="/recherche" className="hover:text-primary">{t("footer.link.all")}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-display font-semibold text-sm mb-3 text-ink">{t("footer.section.categories")}</h3>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li><Link to="/recherche?category=Véhicules" className="hover:text-primary">{tCategory(lang, "Véhicules")}</Link></li>
            <li><Link to="/recherche?category=Immobilier" className="hover:text-primary">{tCategory(lang, "Immobilier")}</Link></li>
            <li><Link to="/recherche?category=Téléphones%20%26%20Tech" className="hover:text-primary">{tCategory(lang, "Téléphones & Tech")}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-display font-semibold text-sm mb-3 text-ink">{t("footer.section.help")}</h3>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li><Link to="/faq" className="hover:text-primary">{t("footer.help.trust")}</Link></li>
            <li><Link to="/faq" className="hover:text-primary">{t("footer.help.delivery")}</Link></li>
            <li><Link to="/contact" className="hover:text-primary">{t("footer.help.contact")}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-display font-semibold text-sm mb-3 text-ink">{t("footer.section.legal")}</h3>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li><Link to="/a-propos" className="hover:text-primary">{t("footer.link.about")}</Link></li>
            <li><Link to="/contact" className="hover:text-primary">{t("footer.link.contact")}</Link></li>
            <li><Link to="/faq" className="hover:text-primary">{t("footer.link.faq")}</Link></li>
            <li><Link to="/conditions" className="hover:text-primary">{t("footer.link.terms")}</Link></li>
            <li><Link to="/confidentialite" className="hover:text-primary">{t("footer.link.privacy")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink/10 py-4 text-center text-xs text-ink-soft">
        © {new Date().getFullYear()} Achri DZ - {t("app.subtitle")} — {t("footer.madeWith")}
      </div>
    </footer>
  );
}
