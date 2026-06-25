import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "../lib/i18n";

export default function FAQ() {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(0);

  const items = [1, 2, 3, 4, 5, 6].map((n) => ({
    q: t(`faq.q${n}`),
    a: t(`faq.a${n}`),
  }));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
      <h1 className="font-display text-2xl font-bold text-ink mb-1">{t("faq.title")}</h1>
      <p className="text-ink-soft leading-relaxed mb-8">{t("faq.subtitle")}</p>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="border border-ink/10 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
            >
              <span className="font-medium text-sm text-ink">{item.q}</span>
              <ChevronDown
                size={18}
                className={`text-ink-soft shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`}
              />
            </button>
            {open === i && (
              <p className="px-4 pb-4 text-sm text-ink-soft leading-relaxed">{item.a}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
