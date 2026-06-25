import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { useI18n } from "../lib/i18n";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <Compass size={40} className="mx-auto text-ink-soft mb-4" />
      <h1 className="font-display text-2xl font-bold text-ink mb-2">{t("notfound.title")}</h1>
      <p className="text-ink-soft mb-6">{t("notfound.text")}</p>
      <Link to="/" className="text-primary font-semibold hover:underline">
        {t("notfound.cta")}
      </Link>
    </div>
  );
}
