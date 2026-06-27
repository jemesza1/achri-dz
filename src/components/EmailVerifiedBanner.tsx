import { useSearchParams } from "react-router-dom";
import { CheckCircle2, X } from "lucide-react";
import { useI18n } from "../lib/i18n";

export default function EmailVerifiedBanner() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useI18n();

  if (searchParams.get("emailVerified") !== "1") return null;

  function dismiss() {
    const params = new URLSearchParams(searchParams);
    params.delete("emailVerified");
    setSearchParams(params, { replace: true });
  }

  return (
    <div className="bg-primary-light text-primary text-sm px-4 py-2.5 flex items-center justify-center gap-2">
      <CheckCircle2 size={15} />
      {t("verify.emailConfirmedBanner")}
      <button onClick={dismiss} aria-label="Fermer" className="ml-2">
        <X size={14} />
      </button>
    </div>
  );
}
