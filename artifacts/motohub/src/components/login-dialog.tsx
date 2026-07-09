import { useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { useUpsertUser, useSignIn, useUpdateUser, useSetUserCpf } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Eye, EyeOff, ExternalLink, ChevronLeft,
  ShoppingBag, Tag, Store, Wrench, Building2, Check, MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ESTADOS, CIDADES_POR_ESTADO, formatLocalidade } from "@/lib/localidades";

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

// 8+ chars with mix (letters + numbers) = forte; 8+ without mix = média; <8 = fraca
function passwordStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (!pw) return { level: 0, label: "", color: "" };
  const hasLetter = /[a-zA-Z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  const long = pw.length >= 8;
  if (!long) return { level: 1, label: "Fraca", color: "bg-red-500" };
  if (long && hasLetter && hasNumber) return { level: 3, label: "Forte", color: "bg-emerald-500" };
  return { level: 2, label: "Média", color: "bg-amber-500" };
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
  storePlaceholder: string;
  storeLabel: string;
  toast: (name: string) => string;
}[] = [
  {
    id: "comprador",
    label: "Comprador",
    desc: "Comprar motos, peças e acessórios",
    icon: ShoppingBag,
    apiType: "pessoa",
    isCompany: false,
    storeLabel: "",
    storePlaceholder: "",
    toast: (n) => `Bem-vindo, ${n}! Explore as melhores motos do Brasil.`,
  },
  {
    id: "vendedor",
    label: "Vendedor particular",
    desc: "Anunciar minha moto ou peças usadas",
    icon: Tag,
    apiType: "pessoa",
    isCompany: false,
    storeLabel: "",
    storePlaceholder: "",
    toast: (n) => `Bem-vindo, ${n}! Seu perfil de vendedor está pronto.`,
  },
  {
    id: "loja",
    label: "Loja de motos",
    desc: "Loja com estoque de motos e peças",
    icon: Store,
    apiType: "empresa",
    isCompany: true,
    storeLabel: "Nome da loja",
    storePlaceholder: "MotoShop Centro",
    toast: (n) => `Bem-vindo, ${n}! Sua loja foi criada com sucesso.`,
  },
  {
    id: "oficina",
    label: "Oficina mecânica",
    desc: "Serviços mecânicos e agendamentos",
    icon: Wrench,
    apiType: "empresa",
    isCompany: true,
    storeLabel: "Nome da oficina",
    storePlaceholder: "Moto Fix RJ",
    toast: (n) => `Bem-vindo, ${n}! Sua oficina está cadastrada na Vermotu.`,
  },
  {
    id: "concessionaria",
    label: "Concessionária",
    desc: "Revenda autorizada de motos novas",
    icon: Building2,
    apiType: "empresa",
    isCompany: true,
    storeLabel: "Nome da concessionária",
    storePlaceholder: "Moto Honda SP",
    toast: (n) => `Bem-vindo, ${n}! Sua concessionária foi cadastrada.`,
  },
];

// ─── Preference options (Step 4) ──────────────────────────────────────────────

const BRAND_OPTIONS = ["Honda", "Yamaha", "Kawasaki", "Suzuki", "BMW", "Ducati", "KTM", "Royal Enfield", "Harley-Davidson", "Triumph", "Bajaj", "Outro"];
const CATEGORY_OPTIONS = ["Naked", "Trail/Adventure", "Custom/Cruiser", "Esportiva", "Scooter/Urban", "Elétrica", "Off-road", "Touring"];
const PRICE_RANGES = [
  { id: "ate-10k", label: "Até R$ 10 mil" },
  { id: "10k-30k", label: "R$ 10–30 mil" },
  { id: "30k-70k", label: "R$ 30–70 mil" },
  { id: "70k-mais", label: "Acima de R$ 70 mil" },
];
const OBJETIVOS = ["Comprar", "Vender", "Trocar", "Apenas explorar"];
const RAIOS_BUSCA = ["Minha cidade", "Até 50 km", "Meu estado", "Todo o Brasil"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
        selected
          ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
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

function StepIndicator({ step }: { step: 1 | 2 | 3 | 4 | 5 }) {
  const steps = [
    { n: 1, label: "Perfil" },
    { n: 2, label: "Dados" },
    { n: 3, label: "Local" },
    { n: 4, label: "Preferências" },
    { n: 5, label: "Confirmar" },
  ] as const;

  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-primary mb-3 text-center tracking-wide uppercase">
        Passo {step} de 5
      </p>
      <div className="flex items-center w-full">
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
    </div>
  );
}

// ─── Signup Wizard ────────────────────────────────────────────────────────────

function SignupWizard({ onSuccess }: { onSuccess: (id: number) => void }) {
  const upsert = useUpsertUser();
  const updateUser = useUpdateUser();
  const setUserCpf = useSetUserCpf();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1
  const [profileType, setProfileType] = useState<AccountProfileType | "">("");
  // Step 2
  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  // Step 3 — Localização
  const [uf, setUf] = useState("");
  const [cidade, setCidade] = useState("");
  const [bairroCep, setBairroCep] = useState("");
  const [raio, setRaio] = useState("");
  // Step 4 — Preferências
  const [prefBrands, setPrefBrands] = useState<string[]>([]);
  const [prefCategories, setPrefCategories] = useState<string[]>([]);
  const [prefPriceRange, setPrefPriceRange] = useState("");
  const [prefObjetivo, setPrefObjetivo] = useState("");
  // Step 5
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

  const cityStr = uf && cidade ? formatLocalidade(cidade, uf) : "";

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
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

      // Enriquecimento best-effort via contratos existentes (não bloqueia o cadastro)
      const docDigits = cpfCnpj.replace(/\D/g, "");
      try {
        const patch: Record<string, string> = {};
        if (cityStr) patch.city = cityStr;
        if (selectedType.isCompany && docDigits.length === 14) patch.cnpj = docDigits;
        if (Object.keys(patch).length > 0) {
          await updateUser.mutateAsync({ id: user.id, data: patch });
        }
      } catch { /* perfil pode ser completado depois em /conta */ }
      try {
        if (!selectedType.isCompany && docDigits.length === 11) {
          await setUserCpf.mutateAsync({ id: user.id, data: { cpf: docDigits } });
        }
      } catch { /* CPF inválido ou já em uso — pode ser ajustado em /conta */ }

      // Preferências e campos sem suporte no backend ficam pendentes no dispositivo
      const pending: Record<string, unknown> = {};
      if (prefBrands.length) pending.brands = prefBrands;
      if (prefCategories.length) pending.categories = prefCategories;
      if (prefPriceRange) pending.priceRange = prefPriceRange;
      if (prefObjetivo) pending.objetivo = prefObjetivo;
      if (raio) pending.raioBusca = raio;
      if (bairroCep.trim()) pending.bairroCep = bairroCep.trim();
      if (birthDate) pending.birthDate = birthDate;
      if (Object.keys(pending).length > 0) {
        try {
          localStorage.setItem(`vermotu:perfil-pendente:${user.id}`, JSON.stringify(pending));
        } catch { /* storage indisponível — ignora */ }
      }

      toast.success(selectedType.toast(user.name.split(" ")[0]));
      onSuccess(user.id);
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  // ── Step 1: Account type selection ─────────────────────────────────────────
  if (step === 1) {
    const handleStep1Submit = (e: React.FormEvent) => {
      e.preventDefault();
      if (profileType) setStep(2);
    };

    return (
      <form onSubmit={handleStep1Submit} className="flex flex-col gap-0">
        <StepIndicator step={1} />
        <p className="text-sm text-muted-foreground mb-3">Escolha o tipo de conta para personalizar sua experiência:</p>
        <div className="grid grid-cols-1 gap-2 mb-4">
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
                  <Icon className="w-4 h-4" />
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
        {/* Sticky footer button */}
        <div className="sticky bottom-0 bg-background pt-2 pb-1">
          <Button type="submit" className="w-full" disabled={!profileType}>
            Próximo
          </Button>
        </div>
      </form>
    );
  }

  // ── Step 2: Personal data ───────────────────────────────────────────────────
  if (step === 2) {
    const handleStep2Submit = (e: React.FormEvent) => {
      e.preventDefault();
      if (step2Valid) setStep(3);
    };

    return (
      <form onSubmit={handleStep2Submit} className="flex flex-col gap-0">
        <StepIndicator step={2} />
        <button
          type="button"
          onClick={() => setStep(1)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-4 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {selectedType?.label}
        </button>

        <div className="space-y-3 mb-4">
          {/* Business name — only for companies */}
          {selectedType?.isCompany && (
            <div className="space-y-1.5">
              <Label htmlFor="su-storename">{selectedType.storeLabel}</Label>
              <Input
                id="su-storename"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder={selectedType.storePlaceholder}
                autoComplete="organization"
              />
            </div>
          )}

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
                  {strength.level < 3 && " — combine letras e números para uma senha mais forte"}
                </p>
              </div>
            )}
          </div>

          {!selectedType?.isCompany && (
            <div className="space-y-1.5">
              <Label htmlFor="su-birth">Data de nascimento <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input
                id="su-birth"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                autoComplete="bday"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="su-doc">{selectedType?.isCompany ? "CNPJ" : "CPF"} <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input
              id="su-doc"
              inputMode="numeric"
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(selectedType?.isCompany ? formatCnpjInput(e.target.value) : formatCpfInput(e.target.value))}
              placeholder={selectedType?.isCompany ? "00.000.000/0000-00" : "000.000.000-00"}
            />
            <p className="text-xs text-muted-foreground">Ajuda a dar mais confiança ao seu perfil.</p>
          </div>
        </div>

        {/* Sticky footer button */}
        <div className="sticky bottom-0 bg-background pt-2 pb-1">
          <Button type="submit" className="w-full" disabled={!step2Valid}>
            Próximo
          </Button>
        </div>
      </form>
    );
  }

  // ── Step 3: Localização ─────────────────────────────────────────────────────
  if (step === 3) {
    const handleStep3Submit = (e: React.FormEvent) => {
      e.preventDefault();
      if (uf && cidade) setStep(4);
    };

    return (
      <form onSubmit={handleStep3Submit} className="flex flex-col gap-0">
        <StepIndicator step={3} />
        <button
          type="button"
          onClick={() => setStep(2)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-4 transition-colors"
        >
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
              <SelectTrigger>
                <SelectValue placeholder="Selecione seu estado" />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS.map((e) => (
                  <SelectItem key={e.uf} value={e.uf}>{e.nome} ({e.uf})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Cidade</Label>
            <Select value={cidade} onValueChange={setCidade} disabled={!uf}>
              <SelectTrigger>
                <SelectValue placeholder={uf ? "Selecione sua cidade" : "Escolha o estado primeiro"} />
              </SelectTrigger>
              <SelectContent>
                {(CIDADES_POR_ESTADO[uf] ?? []).map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="su-bairro">Bairro ou CEP <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input
              id="su-bairro"
              value={bairroCep}
              onChange={(e) => setBairroCep(e.target.value)}
              placeholder="Ex.: Centro ou 20000-000"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Raio de busca preferencial</Label>
            <div className="flex flex-wrap gap-2">
              {RAIOS_BUSCA.map((r) => (
                <Chip key={r} selected={raio === r} onClick={() => setRaio(raio === r ? "" : r)}>{r}</Chip>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky footer buttons */}
        <div className="sticky bottom-0 bg-background pt-2 pb-1 flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(4)}>
            Pular etapa
          </Button>
          <Button type="submit" className="flex-1" disabled={!uf || !cidade}>
            Próximo
          </Button>
        </div>
      </form>
    );
  }

  // ── Step 4: Preferências de moto ────────────────────────────────────────────
  if (step === 4) {
    const handleStep4Submit = (e: React.FormEvent) => {
      e.preventDefault();
      setStep(5);
    };

    const toggle = (list: string[], set: (v: string[]) => void, item: string) =>
      set(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

    return (
      <form onSubmit={handleStep4Submit} className="flex flex-col gap-0">
        <StepIndicator step={4} />
        <button
          type="button"
          onClick={() => setStep(3)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-4 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Voltar
        </button>

        <p className="text-sm text-muted-foreground mb-3">
          Conte o que você curte — tudo aqui é <strong className="text-foreground">opcional</strong>.
        </p>

        <div className="space-y-4 mb-4">
          <div className="space-y-1.5">
            <Label>Quais marcas você prefere?</Label>
            <div className="flex flex-wrap gap-2">
              {BRAND_OPTIONS.map((b) => (
                <Chip key={b} selected={prefBrands.includes(b)} onClick={() => toggle(prefBrands, setPrefBrands, b)}>{b}</Chip>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Categorias de interesse</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((c) => (
                <Chip key={c} selected={prefCategories.includes(c)} onClick={() => toggle(prefCategories, setPrefCategories, c)}>{c}</Chip>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Faixa de preço de interesse</Label>
            <div className="grid grid-cols-2 gap-2">
              {PRICE_RANGES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPrefPriceRange(prefPriceRange === p.id ? "" : p.id)}
                  className={cn(
                    "p-2.5 rounded-xl border text-xs font-medium text-center transition-all",
                    prefPriceRange === p.id
                      ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Objetivo principal</Label>
            <div className="flex flex-wrap gap-2">
              {OBJETIVOS.map((o) => (
                <Chip key={o} selected={prefObjetivo === o} onClick={() => setPrefObjetivo(prefObjetivo === o ? "" : o)}>{o}</Chip>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky footer buttons */}
        <div className="sticky bottom-0 bg-background pt-2 pb-1 flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(5)}>
            Pular etapa
          </Button>
          <Button type="submit" className="flex-1">
            Próximo
          </Button>
        </div>
      </form>
    );
  }

  // ── Step 5: Review + Terms + Submit ────────────────────────────────────────
  const hasPendingPrefs =
    prefBrands.length > 0 || prefCategories.length > 0 || !!prefPriceRange || !!prefObjetivo || !!raio || !!bairroCep.trim() || !!birthDate;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-0">
      <StepIndicator step={5} />
      <button
        type="button"
        onClick={() => setStep(4)}
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

      {hasPendingPrefs && (
        <p className="text-[11px] text-muted-foreground mb-4 -mt-2">
          Suas preferências ficam salvas e ajudam a personalizar sua experiência. Você pode ajustá-las depois em <strong className="text-foreground">Minha conta</strong>.
        </p>
      )}

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

      {/* Sticky footer button */}
      <div className="sticky bottom-0 bg-background pt-2 pb-1">
        <Button
          type="submit"
          className="w-full"
          disabled={!acceptedTerms || upsert.isPending || updateUser.isPending || setUserCpf.isPending}
        >
          {upsert.isPending || updateUser.isPending || setUserCpf.isPending ? "Criando conta..." : "Criar conta grátis"}
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
