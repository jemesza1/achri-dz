import { useI18n } from "../lib/i18n";

export default function Terms() {
  const { t } = useI18n();
  const sections = [1, 2, 3, 4, 5, 6];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
      <h1 className="font-display text-2xl font-bold text-ink mb-1">{t("terms.title")}</h1>
      <p className="text-xs text-ink-soft mb-8">{t("terms.updated")}</p>

      <div className="space-y-6">
        {sections.map((n) => (
          <div key={n}>
            <h2 className="font-display font-semibold text-base text-ink mb-1.5">{t(`terms.s${n}.title`)}</h2>
            <p className="text-sm text-ink-soft leading-relaxed">{t(`terms.s${n}.text`)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
