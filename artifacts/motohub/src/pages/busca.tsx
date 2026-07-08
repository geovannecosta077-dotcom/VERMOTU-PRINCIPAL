import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { useSession, formatRelative, formatPhone } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useParseSearchQuery,
  useCreateServiceRequest,
  useListMyServiceRequests,
  useGetServiceRequest,
  useAcceptServiceProposal,
  useGetUser,
  getListMyServiceRequestsQueryKey,
  getGetServiceRequestQueryKey,
  getGetUserQueryKey,
} from "@workspace/api-client-react";
import type { ParsedSearch } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Zap, Loader2, MapPin, Clock, CheckCircle2, MessageCircle, Sparkles, Wrench, Bike, Package, ShieldCheck, Truck, Landmark, Store } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_META: Record<string, { label: string; icon: typeof Bike }> = {
  moto: { label: "Motos", icon: Bike },
  peca: { label: "Peças", icon: Package },
  servico: { label: "Serviços", icon: Wrench },
  oficina: { label: "Oficinas", icon: Wrench },
  financiamento: { label: "Financiamento", icon: Landmark },
  seguro: { label: "Seguro", icon: ShieldCheck },
  guincho: { label: "Guincho", icon: Truck },
  concessionaria: { label: "Concessionária", icon: Store },
};

const EXAMPLES = [
  "Preciso de um mecânico urgente, minha moto quebrou",
  "Quero comprar uma Honda CB 500 usada",
  "Procuro um pneu 90/90-18",
  "Preciso trocar o óleo essa semana",
];

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
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-primary mb-4">
        ← Nova busca
      </button>

      <Card className="mb-5">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{request.rawQuery}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                  <Badge variant="outline">{meta?.label ?? request.category}</Badge>
                  {request.urgency === "urgente" && <Badge className="bg-primary">Urgente</Badge>}
                  {request.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {request.city}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatRelative(request.createdAt)}
                  </span>
                </div>
              </div>
            </div>
            <Badge variant={isOpen ? "secondary" : "default"} className="capitalize">
              {request.status === "aberta"
                ? "Aguardando propostas"
                : request.status === "em_andamento"
                  ? "Em andamento"
                  : request.status}
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
          Buscando empresas próximas... as propostas aparecem aqui em tempo real
        </div>
      )}

      {proposals.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p>Nenhuma proposta ainda. Assim que uma empresa responder, ela aparece aqui automaticamente.</p>
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
                    {accepted && (
                      <Badge className="bg-primary gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Aceita
                      </Badge>
                    )}
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
                        <p className="font-semibold">
                          {p.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
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
                      {p.contactPhone && (
                        <p className="text-sm font-medium">📞 {formatPhone(p.contactPhone)}</p>
                      )}
                      <Button asChild size="sm" className="w-full gap-2">
                        <Link href="/chat">
                          <MessageCircle className="w-4 h-4" /> Abrir chat
                        </Link>
                      </Button>
                    </div>
                  ) : isOpen ? (
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={accept.isPending}
                      onClick={() => handleAccept(p.id)}
                      data-testid={`button-accept-${p.id}`}
                    >
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
            Você aceitou a proposta de <strong>{acceptedProposal.companyName}</strong>. O chat e o contato já estão liberados
            para vocês dois combinarem os detalhes.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function Busca() {
  const currentUserId = useSession((s) => s.currentUserId);
  const setLoginOpen = useSession((s) => s.setLoginOpen);
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { document.title = "Busca Inteligente — Vermotu"; }, []);

  const { data: user } = useGetUser(currentUserId ?? 0, {
    query: { enabled: !!currentUserId, queryKey: getGetUserQueryKey(currentUserId ?? 0) },
  });
  useEffect(() => {
    if (user?.city && !city) setCity(user.city);
  }, [user?.city]);

  const parseMutation = useParseSearchQuery();
  const createRequest = useCreateServiceRequest();
  const { data: myRequests } = useListMyServiceRequests(
    { customerId: currentUserId ?? 0 },
    { query: { enabled: !!currentUserId, queryKey: getListMyServiceRequestsQueryKey({ customerId: currentUserId ?? 0 }) } },
  );

  const [preview, setPreview] = useState<ParsedSearch | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 4) {
      setPreview(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      parseMutation.mutate(
        { data: { query: query.trim(), city: city || undefined } },
        { onSuccess: (result) => setPreview(result) },
      );
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, city]);

  const meta = preview ? CATEGORY_META[preview.category] : undefined;
  const Icon = meta?.icon ?? Sparkles;

  const handleSubmit = () => {
    if (!currentUserId) { setLoginOpen(true); return; }
    if (!preview || query.trim().length < 2) return;
    createRequest.mutate(
      {
        data: {
          customerId: currentUserId,
          rawQuery: query.trim(),
          category: preview.category,
          subcategory: preview.subcategory ?? undefined,
          brand: preview.brand ?? undefined,
          model: preview.model ?? undefined,
          partType: preview.partType ?? undefined,
          serviceType: preview.serviceType ?? undefined,
          urgency: preview.urgency,
          city: city || undefined,
        },
      },
      {
        onSuccess: (created) => {
          toast.success("Busca enviada! Já estamos notificando empresas.");
          setActiveRequestId(created.id);
          setQuery("");
          setPreview(null);
          queryClient.invalidateQueries({ queryKey: getListMyServiceRequestsQueryKey({ customerId: currentUserId }) });
        },
        onError: () => toast.error("Não foi possível enviar sua busca."),
      },
    );
  };

  if (!currentUserId) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <Zap className="w-10 h-10 mx-auto mb-4 text-primary" />
          <h1 className="text-2xl font-bold mb-2">Busca Inteligente</h1>
          <p className="text-muted-foreground mb-4">Entre para descrever o que você precisa e receber propostas em tempo real.</p>
          <Button onClick={() => setLoginOpen(true)}>Entrar</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="container py-10 max-w-3xl">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">Busca Inteligente</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          Descreva o que você precisa em português normal. A gente identifica categoria, urgência e envia direto para as
          empresas certas — como um Uber, só que para motos.
        </p>

        <Tabs value={activeRequestId ? "resultado" : "nova"} onValueChange={(v) => { if (v === "nova") setActiveRequestId(null); }}>
          <TabsList className="mb-6">
            <TabsTrigger value="nova" data-testid="tab-nova-busca">Nova busca</TabsTrigger>
            <TabsTrigger value="resultado" disabled={!activeRequestId}>Resultado ao vivo</TabsTrigger>
            <TabsTrigger value="minhas" onClick={() => setActiveRequestId(null)} data-testid="tab-minhas-buscas">
              Minhas buscas {myRequests && myRequests.length > 0 ? `(${myRequests.length})` : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nova">
            <Card>
              <CardContent className="p-5 space-y-4">
                <Textarea
                  placeholder="Ex: Preciso de um mecânico urgente, minha moto quebrou..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-h-24 text-base"
                  data-testid="input-busca-query"
                />
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setQuery(ex)}
                      className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-primary hover:text-primary transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="Sua cidade (opcional)"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    data-testid="input-busca-cidade"
                  />
                </div>

                {preview && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/40 border border-border animate-in fade-in">
                    <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div className="text-sm flex-1">
                      <p className="font-medium">{preview.suggestedText}</p>
                      <p className="text-xs text-muted-foreground">Identificamos automaticamente sua necessidade</p>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full gap-2"
                  size="lg"
                  disabled={!preview || createRequest.isPending || query.trim().length < 2}
                  onClick={handleSubmit}
                  data-testid="button-enviar-busca"
                >
                  {createRequest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Enviar busca para empresas
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resultado">
            {activeRequestId && <ProposalsView requestId={activeRequestId} onBack={() => setActiveRequestId(null)} />}
          </TabsContent>

          <TabsContent value="minhas">
            {!myRequests || myRequests.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center text-muted-foreground">
                  Você ainda não fez nenhuma busca.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {myRequests.map(({ request, proposals }) => {
                  const m = CATEGORY_META[request.category];
                  const I = m?.icon ?? Sparkles;
                  return (
                    <Card
                      key={request.id}
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => setActiveRequestId(request.id)}
                      data-testid={`card-minha-busca-${request.id}`}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <I className="w-4.5 h-4.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{request.rawQuery}</p>
                          <p className="text-xs text-muted-foreground">{formatRelative(request.createdAt)} · {proposals.length} proposta(s)</p>
                        </div>
                        <Badge variant={request.status === "aberta" ? "secondary" : "default"} className="capitalize">
                          {request.status === "aberta" ? "Aberta" : request.status === "em_andamento" ? "Em andamento" : request.status}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </Layout>
  );
}
