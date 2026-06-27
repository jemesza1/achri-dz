import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useI18n, tWilaya } from "../lib/i18n";
import { WILAYAS } from "../types";
import GoogleSignInButton from "../components/GoogleSignInButton";

export default function Login() {
  const { login, register } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "register">("login");

  // Shared
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register-only
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilaya, setWilaya] = useState(WILAYAS[0]);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login({ email, password });
      } else {
        await register({ name, email, phone, wilaya, password });
      }
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
      <h1 className="font-display text-2xl font-bold text-ink mb-1">{t("login.welcome")}</h1>
      <p className="text-sm text-ink-soft mb-6">
        {t("login.subtitle")}
      </p>

      <div className="flex rounded-full bg-sand-dim p-1 mb-7 text-sm font-semibold">
        <button
          type="button"
          onClick={() => { setMode("login"); setError(""); }}
          className={`flex-1 h-9 rounded-full transition-colors ${
            mode === "login" ? "bg-white text-primary shadow-sm" : "text-ink-soft"
          }`}
        >
          {t("login.tab.login")}
        </button>
        <button
          type="button"
          onClick={() => { setMode("register"); setError(""); }}
          className={`flex-1 h-9 rounded-full transition-colors ${
            mode === "register" ? "bg-white text-primary shadow-sm" : "text-ink-soft"
          }`}
        >
          {t("login.tab.register")}
        </button>
      </div>

      <div className="mb-5">
        <GoogleSignInButton />
        <div className="flex items-center gap-3 mt-5">
          <div className="flex-1 h-px bg-ink/10" />
          <span className="text-xs text-ink-soft">{t("login.or")}</span>
          <div className="flex-1 h-px bg-ink/10" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "register" && (
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">{t("login.fullName")}</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 rounded-lg border border-ink/15 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">{t("login.email")}</label>
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-11 rounded-lg border border-ink/15 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {mode === "register" && (
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">{t("login.phone")}</label>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-11 rounded-lg border border-ink/15 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        )}

        {mode === "register" && (
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">{t("login.wilaya")}</label>
            <select
              value={wilaya}
              onChange={(e) => setWilaya(e.target.value)}
              className="w-full h-11 rounded-lg border border-ink/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {WILAYAS.map((w) => <option key={w} value={w}>{tWilaya(lang, w)}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">{t("login.password")}</label>
          <input
            required
            type="password"
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-11 rounded-lg border border-ink/15 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {mode === "register" && (
            <p className="text-xs text-ink-soft mt-1">{t("login.passwordHint")}</p>
          )}
        </div>

        {error && <p className="text-rose text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-12 rounded-full bg-primary text-white font-semibold hover:bg-primary-dark transition-colors mt-2 disabled:opacity-60"
        >
          {submitting
            ? t("login.submitWait")
            : mode === "login" ? t("login.submitLogin") : t("login.submitRegister")}
        </button>
      </form>

      <p className="text-xs text-ink-soft mt-5 text-center">
        {t("login.terms")}{" "}
        <Link to="/" className="text-primary hover:underline">{t("login.backHome")}</Link>
      </p>
    </div>
  );
}
