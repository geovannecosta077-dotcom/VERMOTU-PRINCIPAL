import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, CheckCircle2, XCircle, ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSession } from "@/lib/session";

// ─── Password strength ────────────────────────────────────────────────────────
function passwordStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (!pw) return { level: 0, label: "", color: "" };
  const hasLetter = /[a-zA-Z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw);
  const long = pw.length >= 8;
  const veryLong = pw.length >= 12;
  if (!long) return { level: 1, label: "Fraca", color: "bg-red-500" };
  if (long && hasLetter && hasNumber && (hasSpecial || veryLong)) return { level: 3, label: "Forte", color: "bg-emerald-500" };
  if (long && hasLetter && hasNumber) return { level: 2, label: "Média", color: "bg-amber-500" };
  return { level: 1, label: "Fraca", color: "bg-red-500" };
}

function PasswordInput({
  id, value, onChange, placeholder, autoComplete, disabled,
}: {
  id: string; value: string; onChange: (v: string) => void;
  placeholder?: string; autoComplete?: string; disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id} type={show ? "text" : "password"} autoComplete={autoComplete}
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} className="pr-10" disabled={disabled}
      />
      <button
        type="button" tabIndex={-1} onClick={() => setShow((s) => !s)} disabled={disabled}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-40"
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function RecuperarSenha() {
  const [, setLocation] = useLocation();
  const setCurrentUserId = useSession((s) => s.setCurrentUserId);

  // Token can come from URL query param ?token=...
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const urlToken = searchParams.get("token") ?? "";

  const [token, setToken] = useState(urlToken);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const strength = passwordStrength(password);
  const passwordsMatch = confirm.length > 0 && password === confirm;
  const passwordMismatch = confirm.length > 0 && password !== confirm;

  useEffect(() => {
    document.title = "Recuperar senha — Vermotu";
  }, []);

  const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token.trim()) { setError("Informe o código de recuperação."); return; }
    if (password.length < 8) { setError("A senha deve ter ao menos 8 caracteres."); return; }
    if (password !== confirm) { setError("As senhas não coincidem."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Não foi possível redefinir a senha."); return; }
      setDone(true);
      if (data.user?.id) {
        setCurrentUserId(data.user.id);
        toast.success(`Senha redefinida com sucesso! Bem-vindo, ${data.user.name?.split(" ")[0] ?? ""}!`);
        setTimeout(() => setLocation("/"), 2000);
      }
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      {/* Card */}
      <div className="w-full max-w-md">
        {/* Back link */}
        <button
          type="button"
          onClick={() => setLocation("/")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para o início
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Redefinir senha</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Digite o código recebido por e-mail e escolha uma nova senha.
          </p>
        </div>

        {/* Success state */}
        {done ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h2 className="font-semibold text-lg text-foreground">Senha redefinida!</h2>
            <p className="text-sm text-muted-foreground">
              Sua senha foi atualizada com sucesso. Você será redirecionado em instantes.
            </p>
            <Button className="w-full mt-2" onClick={() => setLocation("/")}>
              Ir para o início
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Token */}
            <div className="space-y-1.5">
              <Label htmlFor="rp-token">Código de recuperação</Label>
              <Input
                id="rp-token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Cole o código recebido por e-mail"
                autoComplete="one-time-code"
                disabled={loading}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                O código foi enviado para o seu e-mail e é válido por 1 hora.
              </p>
            </div>

            {/* New password */}
            <div className="space-y-1.5">
              <Label htmlFor="rp-pass">Nova senha</Label>
              <PasswordInput
                id="rp-pass" value={password} onChange={setPassword}
                placeholder="Mínimo 8 caracteres" autoComplete="new-password" disabled={loading}
              />
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1 h-1.5">
                    {([1, 2, 3] as const).map((lvl) => (
                      <div key={lvl} className={cn(
                        "flex-1 rounded-full transition-all duration-300",
                        strength.level >= lvl ? strength.color : "bg-border",
                      )} />
                    ))}
                  </div>
                  <p className={cn("text-[11px] font-medium", {
                    "text-red-500": strength.level === 1,
                    "text-amber-500": strength.level === 2,
                    "text-emerald-500": strength.level === 3,
                  })}>
                    Força: {strength.label}
                    {strength.level < 2 && " — use letras, números e símbolos"}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <Label htmlFor="rp-confirm">Confirmar nova senha</Label>
              <div className="relative">
                <PasswordInput
                  id="rp-confirm" value={confirm} onChange={setConfirm}
                  placeholder="Repita a nova senha" autoComplete="new-password" disabled={loading}
                />
                {passwordsMatch && (
                  <CheckCircle2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 pointer-events-none" />
                )}
                {passwordMismatch && (
                  <XCircle className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500 pointer-events-none" />
                )}
              </div>
              {passwordMismatch && (
                <p className="text-[11px] text-red-500">As senhas não coincidem.</p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex gap-2.5 items-start">
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit" className="w-full h-11 text-base"
              disabled={loading || !token || password.length < 8 || password !== confirm}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redefinindo...</>
              ) : (
                "Redefinir senha"
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Não recebeu o e-mail?{" "}
              <button type="button" onClick={() => setLocation("/")} className="text-primary underline">
                Solicitar novo link
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
