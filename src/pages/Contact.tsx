import { useState } from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import { useI18n } from "../lib/i18n";

export default function Contact() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // No backend mailbox yet — we acknowledge receipt locally so the form
    // feels responsive; the seller/support contact info above is the
    // reliable channel until a real ticketing endpoint exists.
    setSent(true);
    setName("");
    setEmail("");
    setMessage("");
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
      <h1 className="font-display text-2xl font-bold text-ink mb-1">{t("contact.title")}</h1>
      <p className="text-ink-soft leading-relaxed mb-8">{t("contact.subtitle")}</p>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <div className="rounded-2xl border border-ink/10 p-5">
          <Mail size={20} className="text-primary mb-2" />
          <p className="text-xs text-ink-soft mb-0.5">{t("contact.email")}</p>
          <p className="text-sm font-medium text-ink">contact@achridz.dz</p>
        </div>
        <div className="rounded-2xl border border-ink/10 p-5">
          <Phone size={20} className="text-primary mb-2" />
          <p className="text-xs text-ink-soft mb-0.5">{t("contact.phone")}</p>
          <p className="text-sm font-medium text-ink">+213 555 00 00 00</p>
        </div>
        <div className="rounded-2xl border border-ink/10 p-5">
          <MapPin size={20} className="text-primary mb-2" />
          <p className="text-xs text-ink-soft mb-0.5">{t("contact.address")}</p>
          <p className="text-sm font-medium text-ink">{t("contact.addressValue")}</p>
        </div>
      </div>

      <h2 className="font-display text-lg font-bold text-ink mb-4">{t("contact.form.title")}</h2>
      {sent ? (
        <p className="text-primary text-sm bg-primary-light rounded-xl p-4">{t("contact.form.sent")}</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 max-w-lg">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("contact.form.name")}
            className="w-full h-11 rounded-lg border border-ink/15 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("contact.form.email")}
            className="w-full h-11 rounded-lg border border-ink/15 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <textarea
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("contact.form.message")}
            className="w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
          <button
            type="submit"
            className="h-11 px-6 rounded-full bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors"
          >
            {t("contact.form.send")}
          </button>
        </form>
      )}
    </div>
  );
}
