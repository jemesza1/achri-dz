import { ShieldCheck, MapPin, Sparkles } from "lucide-react";
import { useI18n } from "../lib/i18n";

export default function About() {
  const { t } = useI18n();

  const values = [
    { icon: ShieldCheck, title: t("about.value.trust.title"), text: t("about.value.trust.text") },
    { icon: MapPin, title: t("about.value.local.title"), text: t("about.value.local.text") },
    { icon: Sparkles, title: t("about.value.simplicity.title"), text: t("about.value.simplicity.text") },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
      <h1 className="font-display text-2xl font-bold text-ink mb-1">{t("about.title")}</h1>
      <p className="text-ink-soft leading-relaxed mb-8">{t("about.intro")}</p>

      <h2 className="font-display text-lg font-bold text-ink mb-2">{t("about.mission.title")}</h2>
      <p className="text-ink-soft leading-relaxed mb-8">{t("about.mission.text")}</p>

      <h2 className="font-display text-lg font-bold text-ink mb-4">{t("about.values.title")}</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        {values.map((v) => (
          <div key={v.title} className="rounded-2xl border border-ink/10 p-5">
            <v.icon size={22} className="text-primary mb-3" />
            <h3 className="font-display font-semibold text-sm text-ink mb-1.5">{v.title}</h3>
            <p className="text-sm text-ink-soft leading-relaxed">{v.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
