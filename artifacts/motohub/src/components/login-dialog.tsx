import { useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { useUpsertUser, useSignIn } from "@workspace/api-client-react";
import { toast } from "sonner";
import {
  Eye, EyeOff, ExternalLink, ChevronLeft,
  ShoppingBag, Tag, Store, Wrench, Building2, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPhoneInput(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function extractError(err: unknown): string {
  const obj = err as { data?: { error?: string }; message?: string };
  return obj?.data?.error || obj?.message || "Erro inesperado. Tente novamente.";
}

function needsPassword(err: unknown): boolean {
  const obj = err as { data?: { needsPassword?: boolean } };
  return obj?.data?.needsPassword === true;
}

function passwordStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (!pw) return { level: 0, label: "", color: "" };
  const hasLetter = /[a-zA-Z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw);
  const long = pw.length >= 8;
  if (!long) return { level: 1, label: "Fraca", color: "bg-red-500" };
  if (long && (hasLetter && hasNumber) && hasSpecial) return { level: 3, label: "Forte", color: "bg-emerald-500" };
  if (long && (hasLetter || hasNumber)) return { level: 2, label: "Média", color: "bg-amber-500" };
  return { level: 1, label: "Fraca", color: "bg-red-500" };
}

// ─── Account types ────────────────────────────────────────────────────────────

type AccountProfileType = "comprador" | "vendedor" | "loja" | "oficina" | "concessionaria";

const ACCOUNT_TYPES: {
  id: AccountProfileType;
  label: string;
  desc: string;
  icon: typeof ShoppingBag;
  apiType: "pessoa" | "empresa";
  isCompany: boolean;
  toast: (name: string) => string;
}[] = [
  {
    id: "comprador",
    label: "Comprador",
    desc: "Comprar motos, peças e acessórios",
    icon: ShoppingBag,
    apiType: "pessoa",
    isCompany: false,
    toast: (n) => `Bem-vindo, ${n}! Explore as melhores motos do Brasil.`,
  },
  {
    id: "vendedor",
    label: "Vendedor particular",
    desc: "Anunciar minha moto ou peças usadas",
    icon: Tag,
    apiType: "pessoa",
    isCompany: false,
    toast: (n) => `Bem-vindo, ${n}! Seu perfil de vendedor está pronto.`,
  },
  {
    id: "loja",
    label: "Loja de motos",
    desc: "Loja com estoque de motos e peças",
    icon: Store,
    apiType: "empresa",
    isCompany: true,
    toast: (n) => `Bem-vindo, ${n}! Sua loja foi criada com sucesso.`,
  },
  {
    id: "oficina",
    label: "Oficina mecânica",
    desc: "Serviços mecânicos e agendamentos",
    icon: Wrench,
    apiType: "empresa",
    isCompany: true,
    toast: (n) => `Bem-vindo, ${n}! Sua oficina está cadastrada na Vermotu.`,
  },
  {
    id: "concessionaria",
    label: "Concessionária",
    desc: "Revenda autorizada de motos novas",
    icon: Building2,
    apiType: "empresa",
    isCompany: true,
    toast: (n) => `Bem-vindo, ${n}! Sua concessionária foi cadastrada.`,
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function PasswordInput({ id, value, onChange, placeholder, autoComplete }: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Tipo de conta" },
    { n: 2, label: "Seus dados" },
    { n: 3, label: "Confirmar" },
  ] as const;

  return (
    <div className="flex items-center gap-0 w-full mb-5">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1 min-w-0">
          <div className="flex flex-col items-center shrink-0">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                s.n < step
                  ? "bg-primary border-primary text-white"
                  : s.n === step
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground",
              )}
            >
              {s.n < step ? <Check className="w-3.5 h-3.5" /> : s.n}
            </div>
            <span
              className={cn(
                "text-[10px] mt-1 font-medium whitespace-nowrap",
                s.n === step ? "text-primary" : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn("h-px flex-1 mx-1 mb-4 transition-colors", s.n < step ? "bg-primary" : "bg-border")} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Signup Wizard ────────────────────────────────────────────────────────────

function SignupWizard({ onSuccess }: { onSuccess: (id: number) => void }) {
  const upsert = useUpsertUser();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const [profileType, setProfileType] = useState<AccountProfileType | "">("");
  // Step 2
  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  // Step 3
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const selectedType = ACCOUNT_TYPES.find((t) => t.id === profileType);
  const strength = passwordStrength(password);

  const maskEmail = (e: string) => {
    const [local, domain] = e.split("@");
    if (!local || !domain) return e;
    return `${local.slice(0, 2)}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
  };

  const step2Valid =
    name.trim().length >= 2 &&
    email.includes("@") &&
    phone.replace(/\D/g, "").length >= 10 &&
    password.length >= 6 &&
    (!selectedType?.isCompany || storeName.trim().length >= 2);

  const handleSubmit = async () => {
    if (!selectedType) return;
    if (!acceptedTerms) { toast.error("Você precisa aceitar os Termos de Uso e a Política de Privacidade."); return; }
    try {
      const user = await upsert.mutateAsync({
        data: {
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.replace(/\D/g, ""),
          accountType: selectedType.apiType,
          acceptedTerms,
          ...(selectedType.isCompany && storeName.trim() ? { storeName: storeName.trim() } : {}),
        },
      });
      toast.success(selectedType.toast(user.name.split(" ")[0]));
      onSuccess(user.id);
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  // ── Step 1: Account type selection ─────────────────────────────────────────
  if (step === 1) {
    return (
      <div>
        <StepIndicator step={1} />
        <p className="text-sm text-muted-foreground mb-3">Escolha o tipo de conta para personalizar sua experiência:</p>
        <div className="grid grid-cols-1 gap-2">
          {ACCOUNT_TYPES.map((t) => {
            const Icon = t.icon;
            const selected = profileType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setProfileType(t.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                  selected
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  selected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                )}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn("font-semibold text-sm", selected ? "text-primary" : "text-foreground")}>
                    {t.label}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{t.desc}</div>
                </div>
                {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
        <Button
          className="w-full mt-4"
          disabled={!profileType}
          onClick={() => setStep(2)}
        >
          Próximo
        </Button>
      </div>
    );
  }

  // ── Step 2: Personal data ───────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div>
        <StepIndicator step={2} />
        <button
          type="button"
          onClick={() => setStep(1)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-4 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {selectedType?.label}
        </button>

        <div className="space-y-3">
          {/* Business name — only for companies */}
          {selectedType?.isCompany && (
            <div className="space-y-1.5">
              <Label htmlFor="su-storename">
                {selectedType.id === "oficina" ? "Nome da oficina" : selectedType.id === "concessionaria" ? "Nome da concessionária" : "Nome da loja"}
              </Label>
              <Input
                id="su-storename"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder={selectedType.id === "oficina" ? "Moto Fix RJ" : selectedType.id === "concessionaria" ? "Moto Honda RJ" : "MotoShop Centro"}
                autoComplete="organization"
              />
            </div>
          )}

          {/* Full name */}
          <div className="space-y-1.5">
            <Label htmlFor="su-name">Nome completo</Label>
            <Input
              id="su-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Carlos Silva"
              autoComplete="name"
            />
          </div>

          {/* E-mail */}
          <div className="space-y-1.5">
            <Label htmlFor="su-email">E-mail</Label>
            <Input
              id="su-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="carlos@exemplo.com"
              autoComplete="email"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="su-phone">Telefone (WhatsApp)</Label>
            <Input
              id="su-phone"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
              placeholder="(21) 99999-9999"
              autoComplete="tel"
            />
            <p className="text-xs text-muted-foreground">Usado para negociações via WhatsApp.</p>
          </div>

          {/* Password + strength */}
          <div className="space-y-1.5">
            <Label htmlFor="su-pass">Senha</Label>
            <PasswordInput
              id="su-pass"
              value={password}
              onChange={setPassword}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
            {password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1 h-1">
                  {([1, 2, 3] as const).map((lvl) => (
                    <div
                      key={lvl}
                      className={cn(
                        "flex-1 rounded-full transition-colors",
                        strength.level >= lvl ? strength.color : "bg-border",
                      )}
                    />
                  ))}
                </div>
                <p className={cn("text-[11px] font-medium", {
                  "text-red-500": strength.level === 1,
                  "text-amber-500": strength.level === 2,
                  "text-emerald-500": strength.level === 3,
                })}>
                  Senha {strength.label.toLowerCase()}
                  {strength.level < 3 && " — use letras, números e símbolos para torná-la mais forte"}
                </p>
              </div>
            )}
          </div>
        </div>

        <Button
          className="w-full mt-4"
          disabled={!step2Valid}
          onClick={() => setStep(3)}
        >
          Próximo
        </Button>
      </div>
    );
  }

  // ── Step 3: Review + Terms + Submit ────────────────────────────────────────
  return (
    <div>
      <StepIndicator step={3} />
      <button
        type="button"
        onClick={() => setStep(2)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-4 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Voltar
      </button>

      {/* Summary card */}
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
            <span className="text-muted-foreground">Empresa</span>
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
      </div>

      {/* Terms */}
      <label className="flex items-start gap-2 cursor-pointer select-none group mb-4">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="mt-0.5 accent-primary w-4 h-4 shrink-0"
        />
        <span className="text-xs text-muted-foreground leading-relaxed">
          Li e aceito os{" "}
          <a href="/termos" target="_blank" className="text-primary underline inline-flex items-center gap-0.5">
            Termos de Uso <ExternalLink className="w-3 h-3" />
          </a>
          , a{" "}
          <a href="/privacidade" target="_blank" className="text-primary underline inline-flex items-center gap-0.5">
            Política de Privacidade <ExternalLink className="w-3 h-3" />
          </a>{" "}
          e o tratamento dos meus dados pessoais conforme a{" "}
          <strong className="text-foreground">LGPD</strong>.
        </span>
      </label>

      <Button
        className="w-full"
        disabled={!acceptedTerms || upsert.isPending}
        onClick={handleSubmit}
      >
        {upsert.isPending ? "Criando conta..." : "Criar conta grátis"}
      </Button>
    </div>
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
  const signIn = useSignIn();

  const [tab, setTab] = useState<"signin" | "signup" | "setpw">("signin");
  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [setPwEmail, setSetPwEmail] = useState("");
  const [setPwPassword, setSetPwPassword] = useState("");
  const [setPwLoading, setSetPwLoading] = useState(false);

  // Key to reset the SignupWizard when dialog closes
  const [signupKey, setSignupKey] = useState(0);

  const handleClose = (v: boolean) => {
    if (!v) {
      setSigninEmail("");
      setSigninPassword("");
      setSetPwEmail("");
      setSetPwPassword("");
      setSignupKey((k) => k + 1);
    }
    onOpenChange(v);
  };

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signinEmail.trim()) { toast.error("Informe seu e-mail."); return; }
    if (!signinPassword) { toast.error("Informe sua senha."); return; }
    try {
      const user = await signIn.mutateAsync({
        data: { email: signinEmail.trim(), password: signinPassword },
      });
      setCurrentUserId(user.id);
      if (user.isAdmin) {
        setAdminUnlocked(true);
        handleClose(false);
        onLoggedIn?.(user.id);
        toast.success(`Bem-vindo ao painel admin, ${user.name.split(" ")[0]}!`);
        setLocation("/admin");
      } else {
        handleClose(false);
        onLoggedIn?.(user.id);
        toast.success(`Olá de novo, ${user.name.split(" ")[0]}!`);
      }
    } catch (err) {
      if (needsPassword(err)) {
        setSetPwEmail(signinEmail.trim());
        setTab("setpw");
        toast.info("Sua conta não tem senha. Defina uma abaixo.");
      } else {
        toast.error(extractError(err));
      }
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setPwEmail.trim()) { toast.error("Informe seu e-mail."); return; }
    if (setPwPassword.length < 6) { toast.error("A senha deve ter ao menos 6 caracteres."); return; }
    setSetPwLoading(true);
    try {
      const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
      const res = await fetch(`${BASE}/api/users/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: setPwEmail.trim(), password: setPwPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível definir a senha.");
        return;
      }
      setCurrentUserId(data.id);
      handleClose(false);
      onLoggedIn?.(data.id);
      toast.success(`Senha definida! Bem-vindo, ${data.name.split(" ")[0]}!`);
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setSetPwLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[460px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">Acessar a Vermotu</DialogTitle>
          <DialogDescription>
            {tab === "setpw"
              ? "Defina uma senha para acessar sua conta existente."
              : tab === "signup"
                ? "Crie sua conta gratuitamente."
                : "Entre ou crie sua conta para anunciar, comprar e favoritar."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup" | "setpw")} className="mt-2">
          <TabsList className={`grid w-full ${tab === "setpw" ? "grid-cols-3" : "grid-cols-2"}`}>
            <TabsTrigger value="signin">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Criar conta</TabsTrigger>
            {tab === "setpw" && <TabsTrigger value="setpw">Definir senha</TabsTrigger>}
          </TabsList>

          {/* ─── ENTRAR ─── */}
          <TabsContent value="signin">
            <form onSubmit={handleSignin} className="space-y-3 mt-4" autoComplete="on">
              <div className="space-y-1.5">
                <Label htmlFor="si-email">E-mail</Label>
                <Input
                  id="si-email"
                  type="email"
                  autoComplete="email"
                  value={signinEmail}
                  onChange={(e) => setSigninEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="si-pass">Senha</Label>
                <PasswordInput
                  id="si-pass"
                  autoComplete="current-password"
                  value={signinPassword}
                  onChange={setSigninPassword}
                  placeholder="Sua senha"
                />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={signIn.isPending}>
                {signIn.isPending ? "Entrando..." : "Entrar"}
              </Button>
              <p className="text-center text-xs text-muted-foreground pt-1">
                Primeira vez aqui ou sem senha?{" "}
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => { setSetPwEmail(signinEmail); setTab("setpw"); }}
                >
                  Definir senha
                </button>
              </p>
            </form>
          </TabsContent>

          {/* ─── CRIAR CONTA (wizard) ─── */}
          <TabsContent value="signup">
            <div className="mt-4">
              <SignupWizard
                key={signupKey}
                onSuccess={(id) => {
                  setCurrentUserId(id);
                  handleClose(false);
                  onLoggedIn?.(id);
                }}
              />
            </div>
          </TabsContent>

          {/* ─── DEFINIR SENHA ─── */}
          <TabsContent value="setpw">
            <form onSubmit={handleSetPassword} className="space-y-3 mt-4">
              <div className="space-y-1.5">
                <Label htmlFor="sp-email">E-mail da conta</Label>
                <Input
                  id="sp-email"
                  type="email"
                  autoComplete="email"
                  value={setPwEmail}
                  onChange={(e) => setSetPwEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sp-pass">Nova senha</Label>
                <PasswordInput
                  id="sp-pass"
                  autoComplete="new-password"
                  value={setPwPassword}
                  onChange={setSetPwPassword}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={setPwLoading}>
                {setPwLoading ? "Salvando..." : "Definir senha e entrar"}
              </Button>
              <p className="text-xs text-center text-muted-foreground pt-1">
                Isso define a senha para a conta já existente com esse e-mail.
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
