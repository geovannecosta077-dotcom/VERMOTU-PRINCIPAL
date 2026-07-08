import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSession, formatRelative, formatBRL } from "@/lib/session";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateServiceRequest,
  useListMyServiceRequests,
  useAcceptServiceProposal,
  getListMyServiceRequestsQueryKey,
  CreateServiceRequestUrgency,
} from "@workspace/api-client-react";
import { toast } from "sonner";
import { Zap, MapPin, Clock, CheckCircle2, ChevronRight, AlertTriangle, Bike, Wrench, Package, Search, Send } from "lucide-react";
import { ESTADOS, CIDADES_POR_ESTADO } from "@/lib/localidades";

const CATEGORIES = [
  { value: "moto", label: "Moto", icon: Bike },
  { value: "peca", label: "Peça / Acessório", icon: Package },
  { value: "servico", label: "Serviço / Mecânico", icon: Wrench },
  { value: "geral", label: "Outro", icon: Search },
];

const URGENCY = [
  { value: "normal", label: "Normal — pode aguardar alguns dias" },
  { value: "urgente", label: "Urgente — preciso rápido!" },
];

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  aberta: { label: "Aberta", className: "bg-primary/15 text-primary" },
  em_andamento: { label: "Em andamento", className: "bg-blue-500/15 text-blue-500" },
  concluida: { label: "Concluída", className: "bg-emerald-500/15 text-emerald-500" },
  cancelada: { label: "Cancelada", className: "bg-muted text-muted-foreground" },
};

export function Oportunidades() {
  const currentUserId = useSession((s) => s.currentUserId);
  const setLoginOpen = useSession((s) => s.setLoginOpen);
  const queryClient = useQueryClient();

  useEffect(() => { document.title = "Busca Inteligente — Vermotu"; }, []);
  useEffect(() => { if (!currentUserId) setLoginOpen(true); }, [currentUserId, setLoginOpen]);

  const [rawQuery, setRawQuery] = useState("");
  const [category, setCategory] = useState("moto");
  const [urgency, setUrgency] = useState<CreateServiceRequestUrgency>("normal");
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const createRequest = useCreateServiceRequest();
  const acceptProposal = useAcceptServiceProposal();

  const { data: myRequests, isLoading } = useListMyServiceRequests(
    { customerId: currentUserId ?? 0 },
    { query: { enabled: !!currentUserId, refetchInterval: 8000, queryKey: getListMyServiceRequestsQueryKey({ customerId: currentUserId ?? 0 }) } },
  );

  const cidades = estado ? (CIDADES_POR_ESTADO[estado] ?? []) : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) { setLoginOpen(true); return; }
    if (!rawQuery.trim() || rawQuery.trim().length < 10) {
      toast.error("Descreva o que você procura com pelo menos 10 caracteres.");
      return;
    }
    if (!cidade) {
      toast.error("Selecione sua cidade.");
      return;
    }
    createRequest.mutate(
      {
        data: {
          customerId: currentUserId,
          rawQuery: rawQuery.trim(),
          category,
          urgency,
          city: `${cidade}, ${estado}`,
        },
      },
      {
        onSuccess: () => {
          toast.success("Solicitação enviada! Os fornecedores da sua região receberão sua solicitação.");
          setRawQuery("");
          setSubmitted(true);
          queryClient.invalidateQueries({ queryKey: getListMyServiceRequestsQueryKey({ customerId: currentUserId! }) });
        },
        onError: () => toast.error("Não foi possível enviar a solicitação."),
      },
    );
  };

  const handleAccept = (proposalId: number) => {
    if (!currentUserId) return;
    acceptProposal.mutate(
      { id: proposalId, data: { customerId: currentUserId } },
      {
        onSuccess: () => {
          toast.success("Proposta aceita! Você pode agora falar diretamente com o fornecedor no chat.");
          queryClient.invalidateQueries({ queryKey: getListMyServiceRequestsQueryKey({ customerId: currentUserId! }) });
        },
        onError: () => toast.error("Não foi possível aceitar a proposta."),
      },
    );
  };

  if (!currentUserId) {
    return (
      <Layout>
        <section className="container py-20 text-center">
          <Zap className="w-12 h-12 mx-auto mb-4 text-primary" />
          <h1 className="text-2xl font-bold mb-2">Entre para usar a Busca Inteligente</h1>
          <p className="text-muted-foreground mb-6">Descreva o que você procura e receba propostas de fornecedores verificados.</p>
          <Button onClick={() => setLoginOpen(true)}>Entrar / Cadastrar</Button>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="container py-10 max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Zap className="w-5 h-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Busca Inteligente</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Não encontrou o que procura?</h1>
          <p className="text-muted-foreground">
            Descreva o que você precisa e os melhores fornecedores da sua região enviarão propostas para você.
            É gratuito e funciona como o iFood — você compara e escolhe.
          </p>
        </div>

        <Card className="mb-10">
          <CardHeader>
            <CardTitle>Nova solicitação</CardTitle>
            <CardDescription>Seja específico: marca, modelo, ano, orçamento e condição desejada.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>O que você procura? *</Label>
                <Textarea
                  value={rawQuery}
                  onChange={(e) => setRawQuery(e.target.value)}
                  rows={3}
                  placeholder="Ex: Honda CG 160 2020 até R$ 12.000 com baixa km&#10;Ex: Escapamento esportivo para MT-07&#10;Ex: Mecânico urgente para troca de embreagem — Kawasaki Z400"
                  required
                  minLength={10}
                />
                <p className="text-xs text-muted-foreground">{rawQuery.length} caracteres</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Urgência *</Label>
                  <Select value={urgency} onValueChange={(v) => setUrgency(v as CreateServiceRequestUrgency)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {URGENCY.map((u) => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estado *</Label>
                  <Select value={estado} onValueChange={(v) => { setEstado(v); setCidade(""); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione o estado" /></SelectTrigger>
                    <SelectContent>
                      {ESTADOS.map((e) => (
                        <SelectItem key={e.uf} value={e.uf}>{e.nome} ({e.uf})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cidade *</Label>
                  <Select value={cidade} onValueChange={setCidade} disabled={!estado}>
                    <SelectTrigger><SelectValue placeholder={estado ? "Selecione a cidade" : "Escolha o estado primeiro"} /></SelectTrigger>
                    <SelectContent>
                      {cidades.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {urgency === "urgente" && (
                <div className="flex items-start gap-2 rounded-lg bg-primary/10 border border-primary/30 p-3 text-sm text-primary">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Solicitações urgentes são enviadas com prioridade máxima para os 10 fornecedores mais próximos e ativos.</span>
                </div>
              )}

              <Button type="submit" className="w-full gap-2" size="lg" disabled={createRequest.isPending}>
                <Send className="w-4 h-4" />
                {createRequest.isPending ? "Enviando..." : "Enviar solicitação"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {submitted && (myRequests ?? []).length === 0 && (
          <div className="text-center py-10 border border-dashed border-primary/30 rounded-xl bg-primary/5 mb-6">
            <Zap className="w-8 h-8 mx-auto text-primary mb-2" />
            <p className="font-medium">Solicitação enviada!</p>
            <p className="text-sm text-muted-foreground mt-1">Os fornecedores receberão sua solicitação. Atualizando em tempo real...</p>
          </div>
        )}

        {(myRequests ?? []).length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Minhas solicitações</h2>
            <div className="space-y-6">
              {(myRequests ?? []).map(({ request, proposals }) => {
                const st = STATUS_LABELS[request.status] ?? STATUS_LABELS.aberta!;
                const acceptedProposal = proposals.find((p) => p.status === "aceita");
                return (
                  <Card key={request.id}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge className={`text-xs ${st.className}`}>{st.label}</Badge>
                            {request.urgency === "urgente" && (
                              <Badge className="text-xs bg-primary text-white">
                                <Zap className="w-2.5 h-2.5 mr-1" /> Urgente
                              </Badge>
                            )}
                          </div>
                          <p className="font-semibold">{request.rawQuery}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="capitalize">{request.category}</span>
                            {request.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{request.city}</span>}
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatRelative(request.createdAt)}</span>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="text-2xl font-bold text-primary">{proposals.length}</div>
                          <div className="text-xs text-muted-foreground">proposta(s)</div>
                        </div>
                      </div>

                      {proposals.length === 0 && request.status === "aberta" && (
                        <p className="text-sm text-muted-foreground italic">Aguardando propostas dos fornecedores...</p>
                      )}

                      {acceptedProposal && (
                        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm mb-3">
                          <div className="flex items-center gap-2 text-emerald-600 font-medium mb-1">
                            <CheckCircle2 className="w-4 h-4" /> Proposta aceita — {acceptedProposal.companyName}
                          </div>
                          {acceptedProposal.contactPhone && (
                            <p className="text-muted-foreground">WhatsApp desbloqueado: <strong>{acceptedProposal.contactPhone}</strong></p>
                          )}
                          <p className="text-muted-foreground mt-1">Acesse o chat para continuar a negociação.</p>
                        </div>
                      )}

                      {proposals.filter((p) => p.status === "pendente").length > 0 && !acceptedProposal && (
                        <div className="space-y-3">
                          <p className="text-sm font-medium">Propostas recebidas — escolha uma:</p>
                          {proposals.filter((p) => p.status === "pendente").map((p) => (
                            <div key={p.id} className="rounded-lg border border-border p-3 flex items-start justify-between gap-3 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">{p.companyName ?? "Fornecedor"}</div>
                                {p.companyCity && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{p.companyCity}</div>}
                                <p className="text-sm mt-1 text-muted-foreground">{p.message}</p>
                                <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                                  {p.price && <span className="text-primary font-semibold">{formatBRL(p.price)}</span>}
                                  {p.timeframe && <span>⏱ {p.timeframe}</span>}
                                  {p.availability && <span>📅 {p.availability}</span>}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                className="gap-1 shrink-0"
                                disabled={acceptProposal.isPending}
                                onClick={() => handleAccept(p.id)}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Aceitar
                                <ChevronRight className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {isLoading && (
          <p className="text-muted-foreground text-sm text-center py-8">Carregando suas solicitações...</p>
        )}
      </section>
    </Layout>
  );
}
