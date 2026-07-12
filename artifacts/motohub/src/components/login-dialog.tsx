import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/lib/session";
import { useUpsertUser, useSignIn, useUpdateUser, useSetUserCpf } from "@workspace/api-client-react";
import { toast } from "sonner";
import {
  Eye, EyeOff, ExternalLink, ChevronLeft, ChevronRight,
  ShoppingBag, Tag, Store, Wrench, Building2, Check, MapPin,
  KeyRound, Mail, AlertCircle, CheckCircle2, HelpCircle, LifeBuoy,
  Shield, Clock, User, Loader2, RotateCcw, MessageCircleQuestion,
  LockKeyhole, UserX, RefreshCw, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ESTADOS, CIDADES_POR_ESTADO, formatLocalidade } from "@/lib/localidades";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthView =
  | "signin"
  | "signup"
  | "forgot"
  | "reset-sent"
  | "recovery"
  | "resend-verification"
  | "support";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPhoneInput(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function formatCpfInput(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatCnpjInput(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function extractError(err: unknown): string {
  const obj = err as { data?: { error?: string }; message?: string };
  return obj?.data?.error || obj?.message || "Erro inesperado. Tente novamente.";
}

function needsPassword(err: unknown): boolean {
  const obj = err as { data?: { needsPassword?: boolean } };
  return obj?.data?.needsPassword === true;
}

function isLocked(err: unknown): { locked: boolean; until?: string } {
  const obj = err as { data?: { lockedUntil?: string } };
  if (obj?.data?.lockedUntil) return { locked: true, until: obj.data.lockedUntil };
  return { locked: false };
}

function passwordStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string; tip: string } {
  if (!pw) return { level: 0, label: "", color: "", tip: "" };
  const hasLetter = /[a-zA-Z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw);
  const long = pw.length >= 8;
  const veryLong = pw.length >= 12;
  if (!long) return { level: 1, label: "Fraca", color: "bg-red-500", tip: "Use ao menos 8 caracteres" };
  if (long && hasLetter && hasNumber && (hasSpecial || veryLong))
    return { level: 3, label: "Forte", color: "bg-emerald-500", tip: "" };
  if (long && hasLetter && hasNumber)
    return { level: 2, label: "Média", color: "bg-amber-500", tip: "Adicione símbolos (!, @, #…) para mais segurança" };
  return { level: 1, label: "Fraca", color: "bg-red-500", tip: "Combine letras e números" };
}

function maskEmail(e: string): string {
  const [local, domain] = e.split("@");
  if (!local || !domain) return e;
  return `${local.slice(0, 2)}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
}

function formatLockTime(isoStr?: string): string {
  if (!isoStr) return "15 minutos";
  const diff = new Date(isoStr).getTime() - Date.now();
  if (diff <= 0) return "0 minutos";
  const mins = Math.ceil(diff / 60000);
  return `${mins} minuto${mins !== 1 ? "s" : ""}`;
}

// API server URL — reads VITE_API_URL (set in Vercel env vars) for cross-origin deployments.
// Falls back to "" (empty) so calls use relative paths in local dev (API on same host).
const API_SERVER = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/$/, "");

// ─── Sub-components ───────────────────────────────────────────────────────────

function PasswordInput({
  id, value, onChange, placeholder, autoComplete, disabled, "aria-describedby": describedBy,
}: {
  id: string; value: string; onChange: (v: string) => void;
  placeholder?: string; autoComplete?: string; disabled?: boolean; "aria-describedby"?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id} type={show ? "text" : "password"} autoComplete={autoComplete}
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} className="pr-10" disabled={disabled}
        aria-describedby={describedBy}
      />
      <button
        type="button" tabIndex={-1} onClick={() => setShow((s) => !s)} disabled={disabled}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function PasswordStrengthBar({ password }: { password: string }) {
  const s = passwordStrength(password);
  if (!password) return null;
  return (
    <div className="space-y-1" role="status" aria-live="polite" aria-label={`Força da senha: ${s.label}`}>
      <div className="flex gap-1 h-1.5">
        {([1, 2, 3] as const).map((lvl) => (
          <div key={lvl} className={cn(
            "flex-1 rounded-full transition-all duration-300",
            s.level >= lvl ? s.color : "bg-border",
          )} />
        ))}
      </div>
      <p className={cn("text-[11px] font-medium", {
        "text-red-500": s.level === 1,
        "text-amber-500": s.level === 2,
        "text-emerald-500": s.level === 3,
      })}>
        {s.label}{s.tip ? ` — ${s.tip}` : ""}
      </p>
    </div>
  );
}

function ErrorBanner({ message, action }: { message: string; action?: { label: string; onClick: () => void } }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex gap-2.5 items-start">
      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
        {action && (
          <button type="button" onClick={action.onClick}
            className="text-xs text-red-600 dark:text-red-400 underline mt-1 hover:text-red-700">
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

function SuccessBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex gap-2.5 items-start">
      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
      <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function NavBack({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mb-4"
      aria-label={`Voltar para ${label}`}>
      <ArrowLeft className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

// ─── Account types ────────────────────────────────────────────────────────────

type AccountProfileType = "comprador" | "vendedor" | "loja" | "oficina" | "concessionaria";

const ACCOUNT_TYPES: {
  id: AccountProfileType; label: string; desc: string; icon: typeof ShoppingBag;
  apiType: "pessoa" | "empresa"; isCompany: boolean; storeLabel: string; storePlaceholder: string;
  toast: (name: string) => string;
}[] = [
  { id: "comprador", label: "Comprador", desc: "Comprar motos, peças e acessórios", icon: ShoppingBag, apiType: "pessoa", isCompany: false, storeLabel: "", storePlaceholder: "", toast: (n) => `Bem-vindo, ${n}! Explore as melhores motos do Brasil.` },
  { id: "vendedor", label: "Vendedor particular", desc: "Anunciar minha moto ou peças usadas", icon: Tag, apiType: "pessoa", isCompany: false, storeLabel: "", storePlaceholder: "", toast: (n) => `Bem-vindo, ${n}! Seu perfil de vendedor está pronto.` },
  { id: "loja", label: "Loja de motos", desc: "Loja com estoque de motos e peças", icon: Store, apiType: "empresa", isCompany: true, storeLabel: "Nome da loja", storePlaceholder: "MotoShop Centro", toast: (n) => `Bem-vindo, ${n}! Sua loja foi criada com sucesso.` },
  { id: "oficina", label: "Oficina mecânica", desc: "Serviços mecânicos e agendamentos", icon: Wrench, apiType: "empresa", isCompany: true, storeLabel: "Nome da oficina", storePlaceholder: "Moto Fix RJ", toast: (n) => `Bem-vindo, ${n}! Sua oficina está cadastrada na Vermotu.` },
  { id: "concessionaria", label: "Concessionária", desc: "Revenda autorizada de motos novas", icon: Building2, apiType: "empresa", isCompany: true, storeLabel: "Nome da concessionária", storePlaceholder: "Moto Honda SP", toast: (n) => `Bem-vindo, ${n}! Sua concessionária foi cadastrada.` },
];

const BRAND_OPTIONS = ["Honda", "Yamaha", "Kawasaki", "Suzuki", "BMW", "Ducati", "KTM", "Royal Enfield", "Harley-Davidson", "Triumph", "Bajaj", "Outro"];
const CATEGORY_OPTIONS = ["Naked", "Trail/Adventure", "Custom/Cruiser", "Esportiva", "Scooter/Urban", "Elétrica", "Off-road", "Touring"];
const PRICE_RANGES = [{ id: "ate-10k", label: "Até R$ 10 mil" }, { id: "10k-30k", label: "R$ 10–30 mil" }, { id: "30k-70k", label: "R$ 30–70 mil" }, { id: "70k-mais", label: "Acima de R$ 70 mil" }];
const OBJETIVOS = ["Comprar", "Vender", "Trocar", "Apenas explorar"];
const RAIOS_BUSCA = ["Minha cidade", "Até 50 km", "Meu estado", "Todo o Brasil"];

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn("px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
        selected ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")}>
      {children}
    </button>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step, total = 5 }: { step: number; total?: number }) {
  const labels = ["Perfil", "Dados", "Localização", "Preferências", "Confirmar"];
  return (
    <div className="mb-5" role="navigation" aria-label={`Etapa ${step} de ${total}`}>
      <div className="flex justify-between items-center mb-2">
        <p className="text-xs font-semibold text-primary tracking-wide uppercase">
          Etapa {step} de {total}
        </p>
        <p className="text-xs text-muted-foreground">{labels[step - 1]}</p>
      </div>
      <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ─── Sign-in View ─────────────────────────────────────────────────────────────

function SignInView({
  onSuccess,
  onForgot,
  onSignUp,
  onRecovery,
}: {
  onSuccess: (userId: number, isAdmin: boolean, name: string) => void;
  onForgot: (prefillEmail?: string) => void;
  onSignUp: () => void;
  onRecovery: () => void;
}) {
  const signIn = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [lockInfo, setLockInfo] = useState<{ until?: string } | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => { emailRef.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLockInfo(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) { setError("Informe seu e-mail para continuar."); return; }
    if (!trimmedEmail.includes("@")) { setError("Informe um e-mail válido."); return; }
    if (!password) { setError("Informe sua senha para continuar."); return; }

    try {
      const user = await signIn.mutateAsync({ data: { email: trimmedEmail, password } });
      onSuccess(user.id, !!user.isAdmin, user.name);
    } catch (err) {
      const locked = isLocked(err);
      if (locked.locked) {
        setLockInfo({ until: locked.until });
        setError(`Sua conta está bloqueada por tentativas excessivas. Tente novamente em ${formatLockTime(locked.until)}.`);
        return;
      }
      if (needsPassword(err)) {
        onForgot(trimmedEmail);
        toast.info("Sua conta não tem senha definida. Solicite um link de recuperação.");
        return;
      }
      setError(extractError(err));
    }
  };

  return (
    <div className="space-y-0">
      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on" noValidate>
        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="si-email">E-mail</Label>
          <Input
            ref={emailRef}
            id="si-email" type="email" autoComplete="email"
            value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
            placeholder="seu@email.com" inputMode="email"
            aria-required="true"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="si-pass">Senha</Label>
            <button
              type="button"
              onClick={() => onForgot(email.trim())}
              className="text-xs text-primary hover:underline transition-colors"
            >
              Esqueci minha senha
            </button>
          </div>
          <PasswordInput
            id="si-pass" autoComplete="current-password"
            value={password} onChange={(v) => { setPassword(v); setError(""); }}
            placeholder="Sua senha"
          />
        </div>

        {/* Error */}
        <ErrorBanner
          message={error}
          action={lockInfo ? { label: "Recuperar acesso", onClick: () => onForgot(email.trim()) } : undefined}
        />

        {/* Submit */}
        <Button
          type="submit" className="w-full h-11 text-base font-semibold"
          disabled={signIn.isPending} aria-busy={signIn.isPending}
        >
          {signIn.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entrando...</> : "Entrar"}
        </Button>
      </form>

      <SectionDivider label="ou" />

      <div className="space-y-2.5 mt-1">
        <Button variant="outline" className="w-full h-10" onClick={onSignUp} type="button">
          Criar conta gratuita
        </Button>
      </div>

      {/* Help link */}
      <div className="pt-4 text-center">
        <button
          type="button"
          onClick={onRecovery}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Problemas para entrar? Central de ajuda
        </button>
      </div>
    </div>
  );
}

// ─── Forgot Password View ─────────────────────────────────────────────────────

function ForgotPasswordView({
  prefillEmail = "",
  onBack,
  onSent,
}: {
  prefillEmail?: string;
  onBack: () => void;
  onSent: (email: string, devToken?: string) => void;
}) {
  const [email, setEmail] = useState(prefillEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Informe um e-mail válido associado à sua conta.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_SERVER}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json() as { ok?: boolean; devMode?: boolean; devToken?: string; error?: string };
      if (!res.ok) { setError(data.error ?? "Não foi possível processar sua solicitação."); return; }
      onSent(trimmed, data.devToken);
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <NavBack label="Entrar" onClick={onBack} />

      <div className="flex items-start gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <KeyRound className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-sm">Recuperar senha</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Informe seu e-mail e enviaremos um link para redefinir sua senha.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="fp-email">E-mail da conta</Label>
          <Input
            id="fp-email" type="email" inputMode="email" autoComplete="email"
            value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
            placeholder="seu@email.com" aria-required="true" disabled={loading}
            autoFocus
          />
        </div>

        <ErrorBanner message={error} />

        <Button type="submit" className="w-full h-10" disabled={loading || !email.trim()}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : "Enviar link de recuperação"}
        </Button>
      </form>

      <p className="text-xs text-center text-muted-foreground pt-1">
        O link é válido por 1 hora e só pode ser usado uma vez.
      </p>
    </div>
  );
}

// ─── Reset Sent View ──────────────────────────────────────────────────────────

function ResetSentView({
  email,
  devToken,
  onBack,
  onSuccess,
}: {
  email: string;
  devToken?: string;
  onBack: () => void;
  onSuccess: (userId: number, name: string) => void;
}) {
  const [token, setToken] = useState(devToken ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const strength = passwordStrength(password);
  const passwordsMatch = confirm.length > 0 && password === confirm;
  const passwordMismatch = confirm.length > 0 && password !== confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token.trim()) { setError("Informe o código de recuperação recebido por e-mail."); return; }
    if (password.length < 8) { setError("A senha deve ter ao menos 8 caracteres."); return; }
    if (password !== confirm) { setError("As senhas não coincidem."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_SERVER}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), password }),
      });
      const data = await res.json() as { ok?: boolean; user?: { id: number; name: string }; error?: string };
      if (!res.ok) { setError(data.error ?? "Não foi possível redefinir a senha."); return; }
      setDone(true);
      if (data.user) {
        setTimeout(() => onSuccess(data.user!.id, data.user!.name), 1200);
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Senha redefinida!</h3>
          <p className="text-sm text-muted-foreground mt-1">Entrando na sua conta…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <NavBack label="Voltar" onClick={onBack} />

      {/* Success notice */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex gap-2.5 items-start">
        <Mail className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Link enviado</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
            Verifique o e-mail <strong>{maskEmail(email)}</strong> e cole o código abaixo.
          </p>
        </div>
      </div>

      {/* Dev mode notice */}
      {devToken && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
            🛠 Modo desenvolvimento — SMTP não configurado
          </p>
          <p className="text-[11px] text-amber-600 dark:text-amber-500">
            O código foi preenchido automaticamente abaixo. Em produção, configure SMTP_HOST para enviar e-mails reais.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Token */}
        <div className="space-y-1.5">
          <Label htmlFor="rs-token">Código de recuperação</Label>
          <Input
            id="rs-token" value={token}
            onChange={(e) => { setToken(e.target.value); setError(""); }}
            placeholder="Cole o código do e-mail"
            autoComplete="one-time-code"
            className="font-mono text-sm" disabled={loading}
          />
        </div>

        {/* New password */}
        <div className="space-y-1.5">
          <Label htmlFor="rs-pass">Nova senha</Label>
          <PasswordInput
            id="rs-pass" value={password}
            onChange={(v) => { setPassword(v); setError(""); }}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password" disabled={loading}
            aria-describedby="rs-pass-strength"
          />
          <div id="rs-pass-strength">
            <PasswordStrengthBar password={password} />
          </div>
        </div>

        {/* Confirm */}
        <div className="space-y-1.5">
          <Label htmlFor="rs-confirm">Confirmar nova senha</Label>
          <PasswordInput
            id="rs-confirm" value={confirm}
            onChange={(v) => { setConfirm(v); setError(""); }}
            placeholder="Repita a nova senha"
            autoComplete="new-password" disabled={loading}
          />
          {passwordMismatch && <p className="text-[11px] text-red-500">As senhas não coincidem.</p>}
          {passwordsMatch && <p className="text-[11px] text-emerald-500">Senhas coincidem ✓</p>}
        </div>

        <ErrorBanner message={error} />

        <Button
          type="submit" className="w-full h-10"
          disabled={loading || !token || password.length < 8 || password !== confirm}
        >
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redefinindo...</> : "Redefinir senha"}
        </Button>
      </form>

      <div className="text-center pt-1">
        <button type="button" onClick={onBack} className="text-xs text-muted-foreground hover:text-primary transition-colors">
          Não recebeu o código? Tentar novamente
        </button>
      </div>
    </div>
  );
}

// ─── Account Recovery View ────────────────────────────────────────────────────

const RECOVERY_ITEMS = [
  {
    icon: KeyRound,
    title: "Esqueci minha senha",
    desc: "Receba um link seguro por e-mail para criar uma nova senha.",
    action: "forgot" as const,
    cta: "Recuperar senha",
    color: "text-blue-500 bg-blue-500/10",
  },
  {
    icon: Mail,
    title: "Não recebi o e-mail de verificação",
    desc: "Reenvie o e-mail de ativação da conta.",
    action: "resend" as const,
    cta: "Reenviar e-mail",
    color: "text-violet-500 bg-violet-500/10",
  },
  {
    icon: AlertCircle,
    title: "Credenciais incorretas",
    desc: "Verifique se está usando o e-mail correto e tente redefinir a senha.",
    action: "forgot" as const,
    cta: "Redefinir senha",
    color: "text-amber-500 bg-amber-500/10",
  },
  {
    icon: LockKeyhole,
    title: "Conta bloqueada",
    desc: "Após 5 tentativas incorretas, a conta é bloqueada por 15 minutos.",
    action: "forgot" as const,
    cta: "Recuperar acesso",
    color: "text-red-500 bg-red-500/10",
  },
  {
    icon: UserX,
    title: "Conta não encontrada",
    desc: "Verifique se o e-mail está correto ou crie uma nova conta.",
    action: "signup" as const,
    cta: "Criar conta",
    color: "text-gray-500 bg-gray-500/10",
  },
  {
    icon: Clock,
    title: "Sessão expirada",
    desc: "Sua sessão expirou por inatividade. Faça login novamente.",
    action: "signin" as const,
    cta: "Fazer login",
    color: "text-emerald-500 bg-emerald-500/10",
  },
];

function AccountRecoveryView({
  onBack,
  onForgot,
  onSignUp,
  onSignIn,
  onSupport,
  onResendVerification,
}: {
  onBack: () => void;
  onForgot: () => void;
  onSignUp: () => void;
  onSignIn: () => void;
  onSupport: () => void;
  onResendVerification: () => void;
}) {
  const actions = { forgot: onForgot, signup: onSignUp, signin: onSignIn, resend: onResendVerification };

  return (
    <div className="space-y-4">
      <NavBack label="Entrar" onClick={onBack} />

      <div className="flex items-start gap-3 mb-1">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <LifeBuoy className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-sm">Central de recuperação</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Selecione o problema que está enfrentando:
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {RECOVERY_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              type="button"
              onClick={actions[item.action]}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/40 text-left transition-all group"
            >
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", item.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </button>
          );
        })}
      </div>

      <SectionDivider label="Ainda precisa de ajuda?" />

      <Button variant="outline" className="w-full h-10" onClick={onSupport} type="button">
        <MessageCircleQuestion className="w-4 h-4 mr-2" />
        Ver perguntas frequentes
      </Button>
    </div>
  );
}

// ─── Support FAQ View ─────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "Como faço para recuperar minha senha?",
    a: "Clique em 'Esqueci minha senha' na tela de login, informe seu e-mail e enviaremos um link de recuperação com validade de 1 hora.",
  },
  {
    q: "Por que minha conta foi bloqueada?",
    a: "Após 5 tentativas de login incorretas consecutivas, a conta é bloqueada por 15 minutos como medida de segurança. Use 'Recuperar senha' para desbloquear imediatamente.",
  },
  {
    q: "Posso usar a Vermotu sem criar uma conta?",
    a: "Sim! Você pode navegar e pesquisar anúncios sem conta. Para favoritar, comprar, anunciar ou entrar em contato com vendedores, é necessário criar uma conta gratuita.",
  },
  {
    q: "Meus dados estão seguros?",
    a: "Sim. Usamos bcrypt para armazenar senhas de forma segura, HTTPS em todas as comunicações, e seguimos a LGPD no tratamento de dados pessoais.",
  },
  {
    q: "Como faço para excluir minha conta?",
    a: "Entre em contato pelo e-mail de suporte abaixo. Processaremos o pedido em até 5 dias úteis conforme previsto na LGPD.",
  },
  {
    q: "Posso ter mais de uma conta?",
    a: "Cada e-mail e CPF/CNPJ só pode estar associado a uma conta. Se você precisa de perfis diferentes (ex.: vendedor e loja), use e-mails distintos.",
  },
];

function SupportView({ onBack }: { onBack: () => void }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <NavBack label="Voltar" onClick={onBack} />

      <div className="flex items-start gap-3 mb-1">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Shield className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-sm">Perguntas frequentes</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Respostas rápidas para as dúvidas mais comuns.</p>
        </div>
      </div>

      <div className="space-y-1.5" role="list">
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} className="rounded-xl border border-border overflow-hidden" role="listitem">
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
              aria-expanded={open === i}
              aria-controls={`faq-${i}`}
            >
              <span className="text-sm font-medium text-foreground">{item.q}</span>
              <ChevronRight className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", open === i && "rotate-90")} />
            </button>
            {open === i && (
              <div id={`faq-${i}`} className="px-4 pb-3">
                <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <SectionDivider label="Contato" />

      <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">Ainda precisa de ajuda?</p>
        <p className="text-xs text-muted-foreground">
          Nossa equipe responde em até 48 horas úteis.
        </p>
        <a
          href="mailto:suporte@vermotu.com.br"
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <Mail className="w-4 h-4" />
          suporte@vermotu.com.br
        </a>
        <a
          href="/contato"
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ExternalLink className="w-4 h-4" />
          Formulário de contato
        </a>
      </div>
    </div>
  );
}

// ─── Resend Verification View ─────────────────────────────────────────────────

function ResendVerificationView({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) { setError("Informe um e-mail válido."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_SERVER}/api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setError(data.error ?? "Não foi possível processar."); return; }
      setDone(true);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <NavBack label="Voltar" onClick={onBack} />

      <div className="flex items-start gap-3 mb-1">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
          <RefreshCw className="w-4.5 h-4.5 text-violet-500" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-sm">Reenviar verificação</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reenviaremos o e-mail de ativação da sua conta.
          </p>
        </div>
      </div>

      {done ? (
        <SuccessBanner message={`E-mail de verificação reenviado para ${maskEmail(email)}. Verifique também a caixa de spam.`} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="rv-email">E-mail da conta</Label>
            <Input
              id="rv-email" type="email" inputMode="email" autoComplete="email"
              value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="seu@email.com" disabled={loading} autoFocus
            />
          </div>
          <ErrorBanner message={error} />
          <Button type="submit" className="w-full h-10" disabled={loading || !email.trim()}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : "Reenviar e-mail"}
          </Button>
        </form>
      )}
    </div>
  );
}

// ─── Signup Wizard ────────────────────────────────────────────────────────────

function SignupWizard({ onSuccess, onBack }: { onSuccess: (id: number) => void; onBack: () => void }) {
  const upsert = useUpsertUser();
  const updateUser = useUpdateUser();
  const setUserCpf = useSetUserCpf();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  const [profileType, setProfileType] = useState<AccountProfileType | "">("");
  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [uf, setUf] = useState("");
  const [cidade, setCidade] = useState("");
  const [bairroCep, setBairroCep] = useState("");
  const [raio, setRaio] = useState("");
  const [prefBrands, setPrefBrands] = useState<string[]>([]);
  const [prefCategories, setPrefCategories] = useState<string[]>([]);
  const [prefPriceRange, setPrefPriceRange] = useState("");
  const [prefObjetivo, setPrefObjetivo] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const selectedType = ACCOUNT_TYPES.find((t) => t.id === profileType);
  const cityStr = uf && cidade ? formatLocalidade(cidade, uf) : "";

  const step2Valid =
    name.trim().length >= 2 &&
    email.includes("@") &&
    phone.replace(/\D/g, "").length >= 10 &&
    password.length >= 8 &&
    (!selectedType?.isCompany || storeName.trim().length >= 2);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitError("");
    if (!selectedType) return;
    if (!acceptedTerms) { toast.error("Aceite os Termos de Uso para continuar."); return; }
    try {
      const user = await upsert.mutateAsync({
        data: {
          name: name.trim(), email: email.trim(), password,
          phone: phone.replace(/\D/g, ""),
          accountType: selectedType.apiType, acceptedTerms,
          ...(selectedType.isCompany && storeName.trim() ? { storeName: storeName.trim() } : {}),
        },
      });

      const docDigits = cpfCnpj.replace(/\D/g, "");
      const wantsCnpj = selectedType.isCompany && docDigits.length === 14;
      const wantsCpf = !selectedType.isCompany && docDigits.length === 11;
      let citySaved = false;
      let docSaved = false;

      try {
        const patch: Record<string, string> = {};
        if (cityStr) patch.city = cityStr;
        if (wantsCnpj) patch.cnpj = docDigits;
        if (Object.keys(patch).length > 0) {
          await updateUser.mutateAsync({ id: user.id, data: patch });
          citySaved = !!cityStr;
          docSaved = wantsCnpj;
        }
      } catch { /* best-effort */ }

      try {
        if (wantsCpf) { await setUserCpf.mutateAsync({ id: user.id, data: { cpf: docDigits } }); docSaved = true; }
      } catch { /* best-effort */ }

      const pending: Record<string, unknown> = {};
      if (prefBrands.length) pending.brands = prefBrands;
      if (prefCategories.length) pending.categories = prefCategories;
      if (prefPriceRange) pending.priceRange = prefPriceRange;
      if (prefObjetivo) pending.objetivo = prefObjetivo;
      if (raio) pending.raioBusca = raio;
      if (bairroCep.trim()) pending.bairroCep = bairroCep.trim();
      if (birthDate) pending.birthDate = birthDate;
      if (!citySaved && (uf || cidade)) { if (uf) pending.uf = uf; if (cidade) pending.cidade = cidade; if (cityStr) pending.localidade = cityStr; }
      if (!docSaved && docDigits) { pending.documento = docDigits; pending.documentoTipo = selectedType.isCompany ? "cnpj" : "cpf"; }
      if (Object.keys(pending).length > 0) {
        try { localStorage.setItem(`vermotu:perfil-pendente:${user.id}`, JSON.stringify(pending)); } catch { /* ignore */ }
      }

      toast.success(selectedType.toast(user.name.split(" ")[0]!));
      onSuccess(user.id);
    } catch (err) {
      const msg = extractError(err);
      setSubmitError(msg);
    }
  };

  const toggle = (list: string[], setter: (v: string[]) => void, item: string) =>
    setter(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  // ── Step 1 ──
  if (step === 1) {
    return (
      <form onSubmit={(e) => { e.preventDefault(); if (profileType) setStep(2); }} className="flex flex-col gap-0">
        <div className="flex items-center gap-2 mb-4">
          <button type="button" onClick={onBack} className="text-muted-foreground hover:text-primary transition-colors" aria-label="Voltar">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h3 className="text-sm font-semibold text-foreground">Criar conta gratuita</h3>
        </div>
        <StepIndicator step={1} />
        <p className="text-xs text-muted-foreground mb-3">Escolha o tipo de conta para personalizar sua experiência:</p>
        <div className="grid grid-cols-1 gap-2 mb-4">
          {ACCOUNT_TYPES.map((t) => {
            const Icon = t.icon;
            const selected = profileType === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setProfileType(t.id)}
                className={cn("flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                  selected ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border hover:border-primary/40 hover:bg-muted/40")}
                aria-pressed={selected}>
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  selected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn("font-semibold text-sm", selected ? "text-primary" : "text-foreground")}>{t.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{t.desc}</div>
                </div>
                {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
        <div className="sticky bottom-0 bg-background pt-2 pb-1">
          <Button type="submit" className="w-full h-10" disabled={!profileType}>Próximo</Button>
        </div>
      </form>
    );
  }

  // ── Step 2 ──
  if (step === 2) {
    return (
      <form onSubmit={(e) => { e.preventDefault(); if (step2Valid) setStep(3); }} className="flex flex-col gap-0">
        <StepIndicator step={2} />
        <button type="button" onClick={() => setStep(1)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> {selectedType?.label}
        </button>
        <div className="space-y-3 mb-4">
          {selectedType?.isCompany && (
            <div className="space-y-1.5">
              <Label htmlFor="su-storename">{selectedType.storeLabel}</Label>
              <Input id="su-storename" value={storeName} onChange={(e) => setStoreName(e.target.value)}
                placeholder={selectedType.storePlaceholder} autoComplete="organization" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="su-name">Nome completo</Label>
            <Input id="su-name" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Carlos Silva" autoComplete="name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="su-email">E-mail</Label>
            <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="carlos@exemplo.com" autoComplete="email" inputMode="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="su-phone">Telefone (WhatsApp)</Label>
            <Input id="su-phone" inputMode="tel" value={phone}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
              placeholder="(21) 99999-9999" autoComplete="tel" />
            <p className="text-xs text-muted-foreground">Usado para negociações via WhatsApp.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="su-pass">Senha</Label>
            <PasswordInput id="su-pass" value={password} onChange={setPassword}
              placeholder="Mínimo 8 caracteres" autoComplete="new-password"
              aria-describedby="su-pass-strength" />
            <div id="su-pass-strength"><PasswordStrengthBar password={password} /></div>
          </div>
          {!selectedType?.isCompany && (
            <div className="space-y-1.5">
              <Label htmlFor="su-birth">Data de nascimento <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input id="su-birth" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)} autoComplete="bday" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="su-doc">
              {selectedType?.isCompany ? "CNPJ" : "CPF"}{" "}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input id="su-doc" inputMode="numeric" value={cpfCnpj}
              onChange={(e) => setCpfCnpj(selectedType?.isCompany ? formatCnpjInput(e.target.value) : formatCpfInput(e.target.value))}
              placeholder={selectedType?.isCompany ? "00.000.000/0000-00" : "000.000.000-00"} />
            <p className="text-xs text-muted-foreground">Ajuda a dar mais confiança ao seu perfil.</p>
          </div>
        </div>
        <div className="sticky bottom-0 bg-background pt-2 pb-1">
          <Button type="submit" className="w-full h-10" disabled={!step2Valid}>Próximo</Button>
        </div>
      </form>
    );
  }

  // ── Step 3 ──
  if (step === 3) {
    return (
      <form onSubmit={(e) => { e.preventDefault(); if (uf && cidade) setStep(4); }} className="flex flex-col gap-0">
        <StepIndicator step={3} />
        <button type="button" onClick={() => setStep(2)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Voltar
        </button>
        <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          Onde você está? Mostramos anúncios mais perto de você.
        </p>
        <div className="space-y-3 mb-4">
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={uf} onValueChange={(v) => { setUf(v); setCidade(""); }}>
              <SelectTrigger><SelectValue placeholder="Selecione seu estado" /></SelectTrigger>
              <SelectContent>
                {ESTADOS.map((e) => <SelectItem key={e.uf} value={e.uf}>{e.nome} ({e.uf})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Cidade</Label>
            <Select value={cidade} onValueChange={setCidade} disabled={!uf}>
              <SelectTrigger><SelectValue placeholder={uf ? "Selecione sua cidade" : "Escolha o estado primeiro"} /></SelectTrigger>
              <SelectContent>
                {(CIDADES_POR_ESTADO[uf] ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="su-bairro">Bairro ou CEP <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input id="su-bairro" value={bairroCep} onChange={(e) => setBairroCep(e.target.value)}
              placeholder="Ex.: Centro ou 20000-000" />
          </div>
          <div className="space-y-1.5">
            <Label>Raio de busca preferencial</Label>
            <div className="flex flex-wrap gap-2">
              {RAIOS_BUSCA.map((r) => <Chip key={r} selected={raio === r} onClick={() => setRaio(raio === r ? "" : r)}>{r}</Chip>)}
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-background pt-2 pb-1 flex gap-2">
          <Button type="button" variant="outline" className="flex-1 h-10" onClick={() => setStep(4)}>Pular</Button>
          <Button type="submit" className="flex-1 h-10" disabled={!uf || !cidade}>Próximo</Button>
        </div>
      </form>
    );
  }

  // ── Step 4 ──
  if (step === 4) {
    return (
      <form onSubmit={(e) => { e.preventDefault(); setStep(5); }} className="flex flex-col gap-0">
        <StepIndicator step={4} />
        <button type="button" onClick={() => setStep(3)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Voltar
        </button>
        <p className="text-sm text-muted-foreground mb-3">
          Conte o que você curte — tudo aqui é <strong className="text-foreground">opcional</strong>.
        </p>
        <div className="space-y-4 mb-4">
          <div className="space-y-1.5">
            <Label>Quais marcas você prefere?</Label>
            <div className="flex flex-wrap gap-2">
              {BRAND_OPTIONS.map((b) => <Chip key={b} selected={prefBrands.includes(b)} onClick={() => toggle(prefBrands, setPrefBrands, b)}>{b}</Chip>)}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Categorias de interesse</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((c) => <Chip key={c} selected={prefCategories.includes(c)} onClick={() => toggle(prefCategories, setPrefCategories, c)}>{c}</Chip>)}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Faixa de preço</Label>
            <div className="grid grid-cols-2 gap-2">
              {PRICE_RANGES.map((p) => (
                <button key={p.id} type="button" onClick={() => setPrefPriceRange(prefPriceRange === p.id ? "" : p.id)}
                  className={cn("p-2.5 rounded-xl border text-xs font-medium text-center transition-all",
                    prefPriceRange === p.id ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")}
                  aria-pressed={prefPriceRange === p.id}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Objetivo principal</Label>
            <div className="flex flex-wrap gap-2">
              {OBJETIVOS.map((o) => <Chip key={o} selected={prefObjetivo === o} onClick={() => setPrefObjetivo(prefObjetivo === o ? "" : o)}>{o}</Chip>)}
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-background pt-2 pb-1 flex gap-2">
          <Button type="button" variant="outline" className="flex-1 h-10" onClick={() => setStep(5)}>Pular</Button>
          <Button type="submit" className="flex-1 h-10">Próximo</Button>
        </div>
      </form>
    );
  }

  // ── Step 5 ──
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-0">
      <StepIndicator step={5} />
      <button type="button" onClick={() => setStep(4)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-4 transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" /> Voltar
      </button>

      {/* Review card */}
      <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2 mb-4 text-sm">
        <div className="flex items-center gap-2 pb-2 border-b border-border/60">
          {selectedType && (
            <>
              <selectedType.icon className="w-4 h-4 text-primary shrink-0" />
              <span className="font-semibold text-primary">{selectedType.label}</span>
            </>
          )}
        </div>
        {selectedType?.isCompany && storeName && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">{selectedType.storeLabel}</span>
            <span className="font-medium text-right truncate">{storeName}</span>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Nome</span>
          <span className="font-medium text-right truncate">{name}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">E-mail</span>
          <span className="font-medium text-right truncate">{maskEmail(email)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Telefone</span>
          <span className="font-medium text-right">{phone}</span>
        </div>
        {cityStr && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Localização</span>
            <span className="font-medium text-right truncate">{cityStr}</span>
          </div>
        )}
      </div>

      {/* Terms */}
      <label className="flex items-start gap-2.5 cursor-pointer select-none group mb-4">
        <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="mt-0.5 accent-primary w-4 h-4 shrink-0" aria-required="true" />
        <span className="text-xs text-muted-foreground leading-relaxed">
          Li e aceito os{" "}
          <a href="/termos" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-0.5">
            Termos de Uso <ExternalLink className="w-3 h-3" />
          </a>
          , a{" "}
          <a href="/privacidade" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-0.5">
            Política de Privacidade <ExternalLink className="w-3 h-3" />
          </a>{" "}
          e o tratamento dos meus dados conforme a <strong className="text-foreground">LGPD</strong>.
        </span>
      </label>

      {/* Error */}
      {submitError && <ErrorBanner message={submitError} />}

      <div className="sticky bottom-0 bg-background pt-2 pb-1">
        <Button type="submit" className="w-full h-11 text-base font-semibold"
          disabled={!acceptedTerms || upsert.isPending || updateUser.isPending || setUserCpf.isPending}>
          {upsert.isPending || updateUser.isPending || setUserCpf.isPending
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando conta...</>
            : "Criar conta grátis"}
        </Button>
      </div>
    </form>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

export function LoginDialog({
  open,
  onOpenChange,
  onLoggedIn,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onLoggedIn?: (id: number) => void;
}) {
  const setCurrentUserId = useSession((s) => s.setCurrentUserId);
  const setAdminUnlocked = useSession((s) => s.setAdminUnlocked);
  const [, setLocation] = useLocation();

  const [view, setView] = useState<AuthView>("signin");
  const [forgotPrefillEmail, setForgotPrefillEmail] = useState("");
  const [resetSentEmail, setResetSentEmail] = useState("");
  const [resetDevToken, setResetDevToken] = useState<string | undefined>(undefined);
  const [signupKey, setSignupKey] = useState(0);

  const viewTitles: Record<AuthView, string> = {
    signin: "Entrar na Vermotu",
    signup: "Criar conta",
    forgot: "Recuperar senha",
    "reset-sent": "Redefinir senha",
    recovery: "Central de recuperação",
    "resend-verification": "Reenviar verificação",
    support: "Perguntas frequentes",
  };

  const viewDescriptions: Record<AuthView, string> = {
    signin: "Acesse sua conta para anunciar, comprar e favoritar.",
    signup: "Crie sua conta gratuitamente em poucos minutos.",
    forgot: "Vamos enviar um link seguro para seu e-mail.",
    "reset-sent": "Insira o código recebido e crie sua nova senha.",
    recovery: "Encontre a solução para o seu problema de acesso.",
    "resend-verification": "Reenviaremos o e-mail de ativação da sua conta.",
    support: "Respostas para as dúvidas mais comuns.",
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setView("signin");
      setForgotPrefillEmail("");
      setResetSentEmail("");
      setResetDevToken(undefined);
      setSignupKey((k) => k + 1);
    }
    onOpenChange(v);
  };

  const handleSignInSuccess = (userId: number, isAdmin: boolean, name: string) => {
    setCurrentUserId(userId);
    handleClose(false);
    onLoggedIn?.(userId);
    if (isAdmin) {
      setAdminUnlocked(true);
      toast.success(`Bem-vindo ao painel, ${name.split(" ")[0]}!`);
      setLocation("/admin");
    } else {
      toast.success(`Olá de novo, ${name.split(" ")[0]}!`);
    }
  };

  const handleSignUpSuccess = (userId: number) => {
    setCurrentUserId(userId);
    handleClose(false);
    onLoggedIn?.(userId);
  };

  const handleForgotPassword = (prefillEmail = "") => {
    setForgotPrefillEmail(prefillEmail);
    setView("forgot");
  };

  const handleResetSent = (email: string, devToken?: string) => {
    setResetSentEmail(email);
    setResetDevToken(devToken);
    setView("reset-sent");
  };

  const handleResetSuccess = (userId: number, name: string) => {
    setCurrentUserId(userId);
    handleClose(false);
    onLoggedIn?.(userId);
    toast.success(`Senha redefinida! Bem-vindo, ${name.split(" ")[0]}!`);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/60">
          {/* Branding */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-foreground tracking-tight">Vermotu</span>
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              {viewTitles[view]}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {viewDescriptions[view]}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {view === "signin" && (
            <SignInView
              onSuccess={handleSignInSuccess}
              onForgot={handleForgotPassword}
              onSignUp={() => setView("signup")}
              onRecovery={() => setView("recovery")}
            />
          )}
          {view === "signup" && (
            <SignupWizard
              key={signupKey}
              onSuccess={handleSignUpSuccess}
              onBack={() => setView("signin")}
            />
          )}
          {view === "forgot" && (
            <ForgotPasswordView
              prefillEmail={forgotPrefillEmail}
              onBack={() => setView("signin")}
              onSent={handleResetSent}
            />
          )}
          {view === "reset-sent" && (
            <ResetSentView
              email={resetSentEmail}
              devToken={resetDevToken}
              onBack={() => setView("forgot")}
              onSuccess={handleResetSuccess}
            />
          )}
          {view === "recovery" && (
            <AccountRecoveryView
              onBack={() => setView("signin")}
              onForgot={() => handleForgotPassword()}
              onSignUp={() => setView("signup")}
              onSignIn={() => setView("signin")}
              onSupport={() => setView("support")}
              onResendVerification={() => setView("resend-verification")}
            />
          )}
          {view === "resend-verification" && (
            <ResendVerificationView onBack={() => setView("recovery")} />
          )}
          {view === "support" && (
            <SupportView onBack={() => setView("recovery")} />
          )}
        </div>

        {/* Footer */}
        {(view === "signin" || view === "signup") && (
          <div className="px-6 pb-5 pt-0 border-t border-border/40">
            <p className="text-xs text-center text-muted-foreground pt-4">
              {view === "signin" ? (
                <>Não tem conta?{" "}
                  <button type="button" onClick={() => setView("signup")} className="text-primary hover:underline font-medium">
                    Criar conta grátis
                  </button>
                </>
              ) : (
                <>Já tem conta?{" "}
                  <button type="button" onClick={() => setView("signin")} className="text-primary hover:underline font-medium">
                    Entrar
                  </button>
                </>
              )}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
