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
import { Eye, EyeOff, User, Building2, ExternalLink } from "lucide-react";

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
  const upsert = useUpsertUser();
  const signIn = useSignIn();

  const [tab, setTab] = useState<"signin" | "signup" | "setpw">("signin");

  const [name, setName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [accountType, setAccountType] = useState<"pessoa" | "empresa">("pessoa");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");

  const [setPwEmail, setSetPwEmail] = useState("");
  const [setPwPassword, setSetPwPassword] = useState("");
  const [setPwLoading, setSetPwLoading] = useState(false);

  const reset = () => {
    setName(""); setSignupEmail(""); setSignupPassword(""); setPhone("");
    setAccountType("pessoa"); setAcceptedTerms(false);
    setSigninEmail(""); setSigninPassword("");
    setSetPwEmail(""); setSetPwPassword("");
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneDigits = phone.replace(/\D/g, "");
    if (name.trim().length < 2) { toast.error("Informe seu nome completo."); return; }
    if (signupPassword.length < 6) { toast.error("A senha deve ter ao menos 6 caracteres."); return; }
    if (phoneDigits.length < 10) { toast.error("Informe um telefone válido com DDD."); return; }
    if (!acceptedTerms) { toast.error("Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar."); return; }
    try {
      const user = await upsert.mutateAsync({
        data: { name: name.trim(), email: signupEmail.trim(), password: signupPassword, phone: phoneDigits, accountType, acceptedTerms },
      });
      setCurrentUserId(user.id);
      handleClose(false);
      onLoggedIn?.(user.id);
      toast.success(`Bem-vindo ao MotoHub, ${user.name.split(" ")[0]}!`);
    } catch (err) {
      toast.error(extractError(err));
    }
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
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">Acessar o MotoHub</DialogTitle>
          <DialogDescription>
            {tab === "setpw"
              ? "Defina uma senha para acessar sua conta existente."
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
                  placeholder="Mínimo 6 caracteres"
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

          {/* ─── CRIAR CONTA ─── */}
          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-3 mt-4" autoComplete="on">
              {/* Tipo de conta */}
              <div className="space-y-1.5">
                <Label>Tipo de conta</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountType("pessoa")}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                      accountType === "pessoa"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <User className="w-4 h-4" />
                    Pessoa física
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType("empresa")}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                      accountType === "empresa"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    Empresa
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-name">{accountType === "empresa" ? "Nome da empresa" : "Nome completo"}</Label>
                <Input
                  id="su-name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={accountType === "empresa" ? "MotoShop RJ" : "Carlos Silva"}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-email">E-mail</Label>
                <Input
                  id="su-email"
                  type="email"
                  autoComplete="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="carlos@exemplo.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-phone">Telefone (WhatsApp)</Label>
                <Input
                  id="su-phone"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                  placeholder="(21) 99999-9999"
                  required
                />
                <p className="text-xs text-muted-foreground">Usado para falar com compradores via WhatsApp.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-pass">Senha</Label>
                <PasswordInput
                  id="su-pass"
                  autoComplete="new-password"
                  value={signupPassword}
                  onChange={setSignupPassword}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              {/* Termos */}
              <label className="flex items-start gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 accent-primary w-4 h-4 shrink-0"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  Li e aceito os{" "}
                  <a href="/sobre" target="_blank" className="text-primary underline inline-flex items-center gap-0.5">
                    Termos de Uso <ExternalLink className="w-3 h-3" />
                  </a>
                  , a{" "}
                  <a href="/sobre" target="_blank" className="text-primary underline inline-flex items-center gap-0.5">
                    Política de Privacidade <ExternalLink className="w-3 h-3" />
                  </a>{" "}
                  e o tratamento dos meus dados pessoais conforme a{" "}
                  <strong className="text-foreground">LGPD</strong>.
                </span>
              </label>
              <Button type="submit" className="w-full mt-2" disabled={upsert.isPending || !acceptedTerms}>
                {upsert.isPending ? "Criando conta..." : "Criar conta grátis"}
              </Button>
            </form>
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
