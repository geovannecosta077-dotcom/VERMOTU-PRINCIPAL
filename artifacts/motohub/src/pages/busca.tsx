import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { useSession, formatRelative, formatPhone } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateServiceRequest,
  useListMyServiceRequests,
  useGetServiceRequest,
  useAcceptServiceProposal,
  useGetUser,
  getListMyServiceRequestsQueryKey,
  getGetServiceRequestQueryKey,
  getGetUserQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Zap, Loader2, MapPin, Clock, CheckCircle2, MessageCircle,
  Sparkles, Wrench, Bike, Package, ShieldCheck, Truck, Landmark,
  Store, ChevronRight, ChevronLeft, AlertCircle, ShoppingCart,
  Search, Settings,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Category definitions ─────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "moto",        label: "Comprar Moto",       icon: Bike,        color: "text-red-500",    bg: "bg-red-500/10",    category: "moto" },
  { id: "sell_moto",   label: "Vender Moto",         icon: Store,       color: "text-orange-500", bg: "bg-orange-500/10", category: "moto" },
  { id: "peca",        label: "Encontrar Peça",      icon: Package,     color: "text-blue-500",   bg: "bg-blue-500/10",   category: "peca" },
  { id: "oficina",     label: "Encontrar Oficina",   icon: Wrench,      color: "text-emerald-500",bg: "bg-emerald-500/10",category: "oficina" },
  { id: "servico",     label: "Solicitar Serviço",   icon: Settings,    color: "text-purple-500", bg: "bg-purple-500/10", category: "servico" },
  { id: "acessorio",   label: "Acessórios",          icon: ShoppingCart,color: "text-amber-500",  bg: "bg-amber-500/10",  category: "peca" },
  { id: "financiamento",label: "Financiamento",      icon: Landmark,    color: "text-cyan-500",   bg: "bg-cyan-500/10",   category: "financiamento" },
  { id: "guincho",     label: "Guincho / Reboque",   icon: Truck,       color: "text-rose-500",   bg: "bg-rose-500/10",   category: "guincho" },
] as const;

const MOTO_BRANDS = [
  "Honda", "Yamaha", "Kawasaki", "Suzuki", "BMW", "Ducati",
  "KTM", "Royal Enfield", "Harley-Davidson", "Triumph", "Bajaj",
  "Shineray", "Dafra", "Outro",
];

const YEARS = Array.from({ length: 35 }, (_, i) => String(2025 - i));

const PART_TYPES = [
  "Motor", "Freio", "Suspensão", "Elétrica", "Carroceria",
  "Transmissão", "Embreagem", "Filtro / Óleo", "Pneu / Câmara",
  "Acessório", "Outro",
];

const SERVICE_TYPES = [
  "Revisão geral", "Troca de óleo", "Freio", "Suspensão",
  "Motor", "Elétrica / Injeção", "Funilaria / Pintura",
  "Estética", "Personalização", "Outro",
];

const URGENCY_OPTIONS = [
  { id: "normal",      label: "Normal",      sublabel: "Sem pressa",          color: "border-border" },
  { id: "hoje",        label: "Hoje",        sublabel: "Preciso resolver hoje",color: "border-amber-500" },
  { id: "urgente",     label: "Urgente",     sublabel: "O mais rápido possível",color: "border-orange-500" },
  { id: "emergencia",  label: "Emergência",  sublabel: "Moto parada agora",    color: "border-red-500 text-red-500" },
] as const;

const CATEGORY_META: Record<string, { label: string; icon: typeof Bike }> = {
  moto:            { label: "Motos",          icon: Bike },
  peca:            { label: "Peças",          icon: Package },
  servico:         { label: "Serviços",       icon: Wrench },
  oficina:         { label: "Oficinas",       icon: Wrench },
  financiamento:   { label: "Financiamento",  icon: Landmark },
  seguro:          { label: "Seguro",         icon: ShieldCheck },
  guincho:         { label: "Guincho",        icon: Truck },
  concessionaria:  { label: "Concessionária", icon: Store },
  acessorio:       { label: "Acessórios",     icon: ShoppingCart },
};

// ─── Wizard state ─────────────────────────────────────────────────────────────

interface WizardState {
  categoryId: string;
  brand: string;
  model: string;
  year: string;
  partType: string;
  serviceType: string;
  urgency: string;
  city: string;
  description: string;
}

const INITIAL_WIZARD: WizardState = {
  categoryId: "",
  brand: "",
  model: "",
  year: "",
  partType: "",
  serviceType: "",
  urgency: "normal",
  city: "",
  description: "",
};

function buildRawQuery(w: WizardState): string {
  const cat = CATEGORIES.find((c) => c.id === w.categoryId);
  const parts: string[] = [];
  if (cat) parts.push(cat.label);
  if (w.brand) parts.push(w.brand);
  if (w.model) parts.push(w.model);
  if (w.year) parts.push(w.year);
  if (w.partType) parts.push(w.partType);
  if (w.serviceType) parts.push(w.serviceType);
  if (w.city) parts.push(`em ${w.city}`);
  if (w.urgency !== "normal") parts.push(`— ${w.urgency}`);
  if (w.description) parts.push(`(${w.description})`);
  return parts.join(" ");
}

function getApiCategory(categoryId: string): string {
  return CATEGORIES.find((c) => c.id === categoryId)?.category ?? "servico";
}

// ─── Chip Button ──────────────────────────────────────────────────────────────

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full border text-sm transition-all",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border hover:border-primary/50 hover:text-primary",
      )}
    >
      {label}
    </button>
  );
}

// ─── Proposals view ───────────────────────────────────────────────────────────

function ProposalsView({ requestId, onBack }: { requestId: number; onBack: () => void }) {
  const currentUserId = useSession((s) => s.currentUserId);
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetServiceRequest(requestId, {
    query: { refetchInterval: 4000, queryKey: getGetServiceRequestQueryKey(requestId) },
  });
  const accept = useAcceptServiceProposal();
  const meta = data ? CATEGORY_META[data.request.category] : undefined;
  const Icon = meta?.icon ?? Sparkles;

  const handleAccept = (proposalId: number) => {
    if (!currentUserId) return;
    accept.mutate(
      { id: proposalId, data: { customerId: currentUserId } },
      {
        onSuccess: () => {
          toast.success("Proposta aceita! Chat e contato liberados.");
          queryClient.invalidateQueries({ queryKey: getGetServiceRequestQueryKey(requestId) });
          queryClient.invalidateQueries({ queryKey: getListMyServiceRequestsQueryKey({ customerId: currentUserId }) });
        },
        onError: () => toast.error("Não foi possível aceitar a proposta."),
      },
    );
  };

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <Loader2 className="w-6 h-6 animate-spin" />
        <p>Carregando sua busca...</p>
      </div>
    );
  }

  const { request, proposals } = data;
  const isOpen = request.status === "aberta";
  const acceptedProposal = proposals.find((p) => p.id === request.acceptedProposalId);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Nova busca
      </button>

      <Card className="mb-5">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{request.rawQuery}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Badge variant="outline">{meta?.label ?? request.category}</Badge>
                  {request.urgency === "urgente" && <Badge className="bg-primary">Urgente</Badge>}
                  {request.city && (
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {request.city}</span>
                  )}
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatRelative(request.createdAt)}</span>
                </div>
              </div>
            </div>
            <Badge variant={isOpen ? "secondary" : "default"} className="capitalize">
              {request.status === "aberta" ? "Aguardando propostas" : request.status === "em_andamento" ? "Em andamento" : request.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {isOpen && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          Buscando empresas próximas… propostas aparecem aqui em tempo real
        </div>
      )}

      {proposals.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p>Nenhuma proposta ainda. As propostas aparecem aqui automaticamente.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {proposals.map((p) => {
            const accepted = p.status === "aceita";
            const recused = p.status === "recusada";
            return (
              <Card key={p.id} className={accepted ? "border-primary ring-1 ring-primary" : recused ? "opacity-50" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{p.companyName ?? `Empresa #${p.companyId}`}</p>
                    {accepted && <Badge className="bg-primary gap-1"><CheckCircle2 className="w-3 h-3" /> Aceita</Badge>}
                    {recused && <Badge variant="outline">Não escolhida</Badge>}
                  </div>
                  {p.companyCity && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                      <MapPin className="w-3 h-3" /> {p.companyCity}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    {p.price != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Orçamento</p>
                        <p className="font-semibold">{p.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                      </div>
                    )}
                    {p.timeframe && (
                      <div>
                        <p className="text-xs text-muted-foreground">Prazo</p>
                        <p className="font-medium">{p.timeframe}</p>
                      </div>
                    )}
                    {p.availability && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Disponibilidade</p>
                        <p className="font-medium">{p.availability}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{p.message}</p>
                  {accepted ? (
                    <div className="space-y-2">
                      {p.contactPhone && <p className="text-sm font-medium">📞 {formatPhone(p.contactPhone)}</p>}
                      <Button asChild size="sm" className="w-full gap-2">
                        <Link href="/chat"><MessageCircle className="w-4 h-4" /> Abrir chat</Link>
                      </Button>
                    </div>
                  ) : isOpen ? (
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={accept.isPending}
                      onClick={() => handleAccept(p.id)}
                    >
                      {accept.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                      Aceitar proposta
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {acceptedProposal && (
        <Card className="mt-5 border-primary/40 bg-primary/5">
          <CardContent className="p-4 text-sm">
            Você aceitou a proposta de <strong>{acceptedProposal.companyName}</strong>. Chat e contato liberados para combinar os detalhes.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── My Requests List ─────────────────────────────────────────────────────────

function MyRequestsList({ onSelect }: { onSelect: (id: number) => void }) {
  const currentUserId = useSession((s) => s.currentUserId);
  const { data: myRequests, isLoading } = useListMyServiceRequests(
    { customerId: currentUserId ?? 0 },
    { query: { enabled: !!currentUserId, queryKey: getListMyServiceRequestsQueryKey({ customerId: currentUserId ?? 0 }) } },
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-10 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (!myRequests || myRequests.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p>Você ainda não fez nenhuma busca.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {myRequests.map(({ request, proposals }) => {
        const m = CATEGORY_META[request.category];
        const I = m?.icon ?? Sparkles;
        return (
          <Card
            key={request.id}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => onSelect(request.id)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <I className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{request.rawQuery}</p>
                <p className="text-xs text-muted-foreground">
                  {formatRelative(request.createdAt)} · {proposals.length} proposta{proposals.length !== 1 ? "s" : ""}
                </p>
              </div>
              <Badge variant={request.status === "aberta" ? "secondary" : "default"} className="capitalize shrink-0">
                {request.status === "aberta" ? "Aberta" : request.status === "em_andamento" ? "Em andamento" : request.status}
              </Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Progress indicator ───────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full transition-all",
            i < current ? "bg-primary" : i === current ? "bg-primary/50" : "bg-muted",
          )}
        />
      ))}
    </div>
  );
}

// ─── Wizard steps ─────────────────────────────────────────────────────────────

type WizardStep = 0 | 1 | 2 | 3 | 4;

function needsDetails(catId: string): boolean {
  return ["moto", "sell_moto", "peca", "servico", "acessorio"].includes(catId);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Busca() {
  const currentUserId = useSession((s) => s.currentUserId);
  const setLoginOpen = useSession((s) => s.setLoginOpen);
  const queryClient = useQueryClient();
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [step, setStep] = useState<WizardStep>(0);
  const [wizard, setWizard] = useState<WizardState>(INITIAL_WIZARD);

  useEffect(() => { document.title = "Busca Inteligente — Vermotu"; }, []);

  const { data: user } = useGetUser(currentUserId ?? 0, {
    query: { enabled: !!currentUserId, queryKey: getGetUserQueryKey(currentUserId ?? 0) },
  });

  useEffect(() => {
    if (user?.city && !wizard.city) setWizard((w) => ({ ...w, city: user.city ?? "" }));
  }, [user?.city]);

  const createRequest = useCreateServiceRequest();

  const set = <K extends keyof WizardState>(key: K, value: WizardState[K]) =>
    setWizard((w) => ({ ...w, [key]: value }));

  const totalSteps: number = needsDetails(wizard.categoryId) ? 5 : 4;

  const canNext = (): boolean => {
    if (step === 0) return !!wizard.categoryId;
    if (step === 1) return true;
    if (step === 2) return !!wizard.urgency;
    if (step === 3) return true;
    return true;
  };

  const next = () => {
    if (step === 0 && !needsDetails(wizard.categoryId)) {
      setStep(2);
    } else {
      setStep((s) => Math.min(s + 1, 4) as WizardStep);
    }
  };
  const back = () => {
    if (step === 2 && !needsDetails(wizard.categoryId)) {
      setStep(0);
    } else {
      setStep((s) => Math.max(s - 1, 0) as WizardStep);
    }
  };

  const handleSubmit = () => {
    if (!currentUserId) { setLoginOpen(true); return; }
    const rawQuery = buildRawQuery(wizard);
    createRequest.mutate(
      {
        data: {
          customerId: currentUserId,
          rawQuery,
          category: getApiCategory(wizard.categoryId),
          brand: wizard.brand || undefined,
          model: wizard.model || undefined,
          partType: wizard.partType || undefined,
          serviceType: wizard.serviceType || undefined,
          urgency: wizard.urgency === "emergencia" || wizard.urgency === "urgente" ? "urgente" : "normal",
          city: wizard.city || undefined,
        },
      },
      {
        onSuccess: (created) => {
          toast.success("Busca enviada! Notificando empresas agora.");
          setActiveRequestId(created.id);
          setWizard(INITIAL_WIZARD);
          setStep(0);
          if (currentUserId) queryClient.invalidateQueries({ queryKey: getListMyServiceRequestsQueryKey({ customerId: currentUserId }) });
        },
        onError: () => toast.error("Não foi possível enviar sua busca."),
      },
    );
  };

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!currentUserId) {
    return (
      <Layout>
        <div className="container py-20 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Busca Inteligente</h1>
          <p className="text-muted-foreground mb-6">
            Diga o que você precisa em poucos toques e receba propostas de empresas em tempo real.
          </p>
          <Button size="lg" className="w-full" onClick={() => setLoginOpen(true)}>
            Entrar para usar
          </Button>
        </div>
      </Layout>
    );
  }

  // ── Result / History views ─────────────────────────────────────────────────
  if (activeRequestId) {
    return (
      <Layout>
        <section className="container py-6 max-w-3xl">
          <ProposalsView requestId={activeRequestId} onBack={() => setActiveRequestId(null)} />
        </section>
      </Layout>
    );
  }

  if (showHistory) {
    return (
      <Layout>
        <section className="container py-6 max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setShowHistory(false)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Nova busca
            </button>
            <h1 className="text-xl font-bold">Minhas buscas</h1>
          </div>
          <MyRequestsList onSelect={(id) => { setShowHistory(false); setActiveRequestId(id); }} />
        </section>
      </Layout>
    );
  }

  // ── Wizard ─────────────────────────────────────────────────────────────────
  const selectedCat = CATEGORIES.find((c) => c.id === wizard.categoryId);

  return (
    <Layout>
      <section className="container py-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold">Busca Inteligente</h1>
          </div>
          <button
            onClick={() => setShowHistory(true)}
            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            <Clock className="w-3.5 h-3.5" /> Minhas buscas
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          {step === 0 && "O que você está procurando?"}
          {step === 1 && "Detalhes do que você precisa"}
          {step === 2 && "Qual é a urgência?"}
          {step === 3 && "Onde você está?"}
          {step === 4 && "Alguma observação? (opcional)"}
        </p>

        <StepIndicator current={step} total={totalSteps} />

        {/* ── Step 0: Category ────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const selected = wizard.categoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { set("categoryId", cat.id); }}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all",
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/40 hover:bg-accent/40",
                  )}
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", selected ? "bg-primary/15" : cat.bg)}>
                    <Icon className={cn("w-5 h-5", selected ? "text-primary" : cat.color)} />
                  </div>
                  <span className={cn("text-xs font-medium leading-tight", selected && "text-primary")}>{cat.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Step 1: Details (conditional) ───────────────────────────────── */}
        {step === 1 && needsDetails(wizard.categoryId) && (
          <div className="space-y-5">
            {(wizard.categoryId === "moto" || wizard.categoryId === "sell_moto") && (
              <>
                <div>
                  <p className="text-sm font-medium mb-2">Marca</p>
                  <div className="flex flex-wrap gap-2">
                    {MOTO_BRANDS.map((b) => (
                      <Chip key={b} label={b} selected={wizard.brand === b} onClick={() => set("brand", wizard.brand === b ? "" : b)} />
                    ))}
                  </div>
                </div>
                {wizard.brand && wizard.brand !== "Outro" && (
                  <div>
                    <p className="text-sm font-medium mb-2">Modelo (opcional)</p>
                    <Input
                      placeholder="Ex: CB 500, MT-07, R1..."
                      value={wizard.model}
                      onChange={(e) => set("model", e.target.value)}
                    />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium mb-2">Ano (opcional)</p>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {YEARS.slice(0, 15).map((y) => (
                      <Chip key={y} label={y} selected={wizard.year === y} onClick={() => set("year", wizard.year === y ? "" : y)} />
                    ))}
                  </div>
                </div>
              </>
            )}
            {(wizard.categoryId === "peca" || wizard.categoryId === "acessorio") && (
              <>
                <div>
                  <p className="text-sm font-medium mb-2">Tipo de peça</p>
                  <div className="flex flex-wrap gap-2">
                    {PART_TYPES.map((t) => (
                      <Chip key={t} label={t} selected={wizard.partType === t} onClick={() => set("partType", wizard.partType === t ? "" : t)} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Marca da moto (opcional)</p>
                  <div className="flex flex-wrap gap-2">
                    {MOTO_BRANDS.slice(0, 8).map((b) => (
                      <Chip key={b} label={b} selected={wizard.brand === b} onClick={() => set("brand", wizard.brand === b ? "" : b)} />
                    ))}
                  </div>
                </div>
              </>
            )}
            {wizard.categoryId === "servico" && (
              <div>
                <p className="text-sm font-medium mb-2">Tipo de serviço</p>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_TYPES.map((t) => (
                    <Chip key={t} label={t} selected={wizard.serviceType === t} onClick={() => set("serviceType", wizard.serviceType === t ? "" : t)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Urgency ─────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-3">
            {URGENCY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => set("urgency", opt.id)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all",
                  wizard.urgency === opt.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : `border-border hover:border-primary/40 ${opt.color}`,
                )}
              >
                <div>
                  <p className="font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.sublabel}</p>
                </div>
                {wizard.urgency === opt.id && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        )}

        {/* ── Step 3: Location ────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Sua cidade (ex: Rio de Janeiro, São Paulo...)"
                value={wizard.city}
                onChange={(e) => set("city", e.target.value)}
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Empresas próximas recebem sua solicitação primeiro.
            </p>
          </div>
        )}

        {/* ── Step 4: Description ─────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-4">
            <Textarea
              placeholder="Descreva mais detalhes se quiser… (opcional)"
              value={wizard.description}
              onChange={(e) => set("description", e.target.value)}
              className="min-h-28 text-base"
            />
            {/* Preview */}
            {wizard.categoryId && (
              <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resumo da busca</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCat && (
                    <Badge variant="secondary" className="gap-1">
                      {(() => { const I = selectedCat.icon; return <I className="w-3 h-3" />; })()}
                      {selectedCat.label}
                    </Badge>
                  )}
                  {wizard.brand && <Badge variant="outline">{wizard.brand}</Badge>}
                  {wizard.model && <Badge variant="outline">{wizard.model}</Badge>}
                  {wizard.year && <Badge variant="outline">{wizard.year}</Badge>}
                  {wizard.partType && <Badge variant="outline">{wizard.partType}</Badge>}
                  {wizard.serviceType && <Badge variant="outline">{wizard.serviceType}</Badge>}
                  {wizard.city && (
                    <Badge variant="outline" className="gap-1">
                      <MapPin className="w-3 h-3" /> {wizard.city}
                    </Badge>
                  )}
                  {wizard.urgency !== "normal" && (
                    <Badge className={wizard.urgency === "emergencia" ? "bg-red-500" : wizard.urgency === "urgente" ? "bg-orange-500" : "bg-amber-500"}>
                      {wizard.urgency}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Navigation buttons ───────────────────────────────────────────── */}
        <div className={cn("flex gap-3 mt-6", step === 0 ? "justify-end" : "justify-between")}>
          {step > 0 && (
            <Button variant="outline" onClick={back} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Voltar
            </Button>
          )}

          {step < (needsDetails(wizard.categoryId) ? 4 : 3) ? (
            <Button
              disabled={!canNext()}
              onClick={next}
              className="gap-1 ml-auto"
            >
              Próximo <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              disabled={!wizard.categoryId || createRequest.isPending}
              onClick={handleSubmit}
              className="gap-2 flex-1"
              size="lg"
            >
              {createRequest.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</>
                : <><Zap className="w-4 h-4" /> Enviar busca para empresas</>}
            </Button>
          )}
        </div>
      </section>
    </Layout>
  );
}
