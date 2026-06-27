import { useState } from "react";
import { Mail, Phone, CheckCircle2 } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { resendVerificationEmail, requestPhoneOtp, verifyPhoneOtp } from "../lib/api";

export default function VerificationPanel() {
  const { user, setUser } = useAuth();
  const { t } = useI18n();
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [emailError, setEmailError] = useState("");
  const [otpStatus, setOtpStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [otpError, setOtpError] = useState("");
  const [code, setCode] = useState("");
  const [confirming, setConfirming] = useState(false);

  if (!user || (user.emailVerified && user.phoneVerified)) return null;

  async function handleResendEmail() {
    setEmailStatus("sending");
    setEmailError("");
    try {
      await resendVerificationEmail();
      setEmailStatus("sent");
    } catch (err: any) {
      setEmailError(err.message);
      setEmailStatus("idle");
    }
  }

  async function handleSendOtp() {
    setOtpStatus("sending");
    setOtpError("");
    try {
      await requestPhoneOtp();
      setOtpStatus("sent");
    } catch (err: any) {
      setOtpError(err.message);
      setOtpStatus("idle");
    }
  }

  async function handleConfirmOtp(e: React.FormEvent) {
    e.preventDefault();
    setConfirming(true);
    setOtpError("");
    try {
      const updated = await verifyPhoneOtp(code);
      setUser(updated);
    } catch (err: any) {
      setOtpError(err.message);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="border border-amber/40 bg-amber/10 rounded-2xl p-4 mb-6 space-y-3">
      <h2 className="font-display font-semibold text-sm text-ink">{t("verify.title")}</h2>
      <p className="text-xs text-ink-soft">{t("verify.needOneMethod")}</p>

      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-1.5">
          <Mail size={14} className={user.emailVerified ? "text-primary" : "text-ink-soft"} />
          {user.emailVerified ? t("verify.emailVerified") : t("verify.emailPending")}
        </span>
        {!user.emailVerified && (
          <button
            type="button"
            disabled={emailStatus !== "idle"}
            onClick={handleResendEmail}
            className="text-xs font-medium text-primary hover:underline disabled:opacity-60 shrink-0"
          >
            {emailStatus === "sent" ? <span className="flex items-center gap-1"><CheckCircle2 size={12} /> {t("verify.emailSent")}</span> : t("verify.resendEmail")}
          </button>
        )}
      </div>
      {emailError && <p className="text-rose text-xs">{emailError}</p>}

      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-1.5">
          <Phone size={14} className={user.phoneVerified ? "text-primary" : "text-ink-soft"} />
          {user.phoneVerified ? t("verify.phoneVerified") : t("verify.phonePending")}
        </span>
        {!user.phoneVerified && otpStatus !== "sent" && (
          <button
            type="button"
            disabled={otpStatus === "sending"}
            onClick={handleSendOtp}
            className="text-xs font-medium text-primary hover:underline disabled:opacity-60 shrink-0"
          >
            {t("verify.sendCode")}
          </button>
        )}
      </div>

      {!user.phoneVerified && otpStatus === "sent" && (
        <form onSubmit={handleConfirmOtp} className="flex gap-2">
          <input
            required
            inputMode="numeric"
            maxLength={6}
            placeholder={t("verify.codePlaceholder")}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 h-9 rounded-lg border border-ink/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit"
            disabled={confirming}
            className="h-9 px-4 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60"
          >
            {t("verify.confirmCode")}
          </button>
        </form>
      )}
      {otpError && <p className="text-rose text-xs">{otpError}</p>}
    </div>
  );
}
