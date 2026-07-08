import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { useSession, formatBRL } from "@/lib/session";
import {
  useGetUser,
  useListSubscriptions,
  useCreateSubscription,
  getGetUserQueryKey,
  getListSubscriptionsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUpload } from "@workspace/object-storage-web";
import {
  Check, Crown, Copy, Upload, Loader2, CheckCircle2, Clock,
  X, CreditCard, ImageIcon,
} from "lucide-react";

const PIX_INFO = {
  pro: {
    label: "Básico",
    amount: 49,
    code: "00020126580014br.gov.bcb.pix01362504a042-8fee-4e1c-a908-17dff6449c8627600016BR.COM.PAGSEGURO01368C053B4F-1F47-4BBF-8275-488BC62E9F3B520489995303986540549.005802BR5922GEOVANNE BARBOZA COSTA6014RIO DE JANEIRO62290525PAGS0000049002606120212566304C61B",
    key: "2504a042-8fee-4e1c-a908-17dff6449c86",
  },
  premium: {
    label: "Premium",
    amount: 99,
    code: "00020126580014br.gov.bcb.pix01362504a042-8fee-4e1c-a908-17dff6449c8627600016BR.COM.PAGSEGURO0136B58F4176-640D-4C60-97B9-A6160F874438520489995303986540599.005802BR5922GEOVANNE BARBOZA COSTA6014RIO DE JANEIRO62290525PAGS00000990026061202136363044330",
    key: "2504a042-8fee-4e1c-a908-17dff6449c86",
  },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  awaiting_payment: { label: "Aguardando pagamento", color: "bg-amber-500/15 text-amber-500" },
  proof_submitted: { label: "Comprovante enviado — em análise", color: "bg-blue-500/15 text-blue-500" },
  in_review: { label: "Em análise", color: "bg-purple-500/15 text-purple-500" },
  approved: { label: "Aprovado ✓", color: "bg-emerald-500/15 text-emerald-500" },
  rejected: { label: "Rejeitado", color: "bg-red-500/15 text-red-500" },
  expired: { label: "Expirado", color: "bg-gray-500/15 text-gray-500" },
};

const plans = [
  {
    id: "free" as const,
    name: "Grátis",
    price: 0,
    description: "Para começar a vender",
    features: ["Até 3 anúncios ativos", "Mensagens ilimitadas", "Suporte por e-mail"],
  },
  {
    id: "pro" as const,
    name: "Básico",
    price: 49,
    description: "Para vendedores frequentes",
    features: ["Anúncios ilimitados", "1 anúncio em destaque", "Estatísticas básicas", "Suporte prioritário"],
    popular: true,
  },
  {
    id: "premium" as const,
    name: "Premium",
    price: 99,
    description: "Para lojas e profissionais",
    features: ["Tudo do Básico", "5 anúncios em destaque", "Selo Premium", "Estatísticas avançadas", "Atendimento dedicado"],
  },
];

export function Planos() {
  const currentUserId = useSession((s) => s.currentUserId);
  const setLoginOpen = useSession((s) => s.setLoginOpen);
  const queryClient = useQueryClient();

  const { data: user } = useGetUser(currentUserId ?? 0, {
    query: { enabled: !!currentUserId, queryKey: getGetUserQueryKey(currentUserId ?? 0) },
  });
  const { data: subscriptions } = useListSubscriptions(
    { userId: currentUserId ?? 0 },
    { query: { enabled: !!currentUserId, queryKey: getListSubscriptionsQueryKey({ userId: currentUserId ?? 0 }) } },
  );
  const createSubscription = useCreateSubscription();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "premium">("pro");
  const [proofUrl, setProofUrl] = useState("");
  const [proofName, setProofName] = useState("");
  const [copied, setCopied] = useState(false);

  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (res) => {
      setProofUrl(res.objectPath);
      setProofName(res.objectPath.split("/").pop() ?? "comprovante");
      toast.success("Comprovante enviado! Agora clique em Confirmar.");
    },
    onError: () => toast.error("Falha no upload do comprovante. Tente novamente."),
  });

  useEffect(() => { document.title = "Planos — Vermotu"; }, []);

  const activeSub = (subscriptions ?? []).find((s) => ["proof_submitted", "in_review", "approved"].includes(s.status));
  const pendingSub = (subscriptions ?? []).find((s) => ["awaiting_payment", "proof_submitted", "in_review"].includes(s.status));

  const openDialog = (plan: "pro" | "premium") => {
    if (!currentUserId) { setLoginOpen(true); return; }
    setSelectedPlan(plan);
    setStep(1);
    setProofUrl("");
    setProofName("");
    setCopied(false);
    setDialogOpen(true);
  };

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const onPickProof = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file);
  };

  const submitSubscription = () => {
    if (!currentUserId || !proofUrl) {
      toast.error("Envie o comprovante antes de confirmar.");
      return;
    }
    createSubscription.mutate(
      { data: { userId: currentUserId, plan: selectedPlan, proofUrl, proofName } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSubscriptionsQueryKey({ userId: currentUserId }) });
          setStep(3);
        },
        onError: () => toast.error("Erro ao registrar assinatura. Tente novamente."),
      },
    );
  };

  const pix = PIX_INFO[selectedPlan];

  return (
    <Layout>
      <section className="container py-12">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-4xl font-bold mb-3">Planos premium</h1>
          <p className="text-muted-foreground text-lg">
            Mais visibilidade, mais vendas. Pague via PIX e tenha seu plano ativado em até 24h.
          </p>
        </div>

        {pendingSub && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className={`rounded-xl border p-4 flex items-center gap-3 ${pendingSub.status === "approved" ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
              {pendingSub.status === "approved" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : (
                <Clock className="w-5 h-5 text-amber-500 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">Assinatura — Plano {pendingSub.plan === "pro" ? "Básico" : "Premium"}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  <Badge className={`text-[10px] h-4 px-1.5 ${STATUS_LABELS[pendingSub.status]?.color ?? ""}`}>
                    {STATUS_LABELS[pendingSub.status]?.label ?? pendingSub.status}
                  </Badge>
                </div>
              </div>
              <div className="text-sm font-bold">{formatBRL(pendingSub.amount)}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((p) => {
            const isCurrent = user?.plan === p.id;
            const hasPending = pendingSub?.plan === p.id;
            return (
              <Card key={p.id} className={`relative ${p.popular ? "border-primary shadow-lg shadow-primary/10" : ""}`}>
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    Mais popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {p.id === "premium" && <Crown className="w-5 h-5 text-primary" />}
                    {p.name}
                  </CardTitle>
                  <CardDescription>{p.description}</CardDescription>
                  <div className="mt-3">
                    <span className="text-4xl font-bold">
                      {p.price === 0 ? "Grátis" : `R$ ${p.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                    </span>
                    {p.price > 0 && <span className="text-muted-foreground">/mês</span>}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {p.id === "free" ? (
                    <Button className="w-full" variant="outline" disabled={isCurrent}>
                      {isCurrent ? "Plano atual" : "Selecionar"}
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={p.popular ? "default" : "outline"}
                      onClick={() => openDialog(p.id)}
                      disabled={isCurrent || !!hasPending}
                    >
                      {isCurrent ? "Plano atual" : hasPending ? "Aguardando aprovação" : `Assinar via PIX`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="max-w-2xl mx-auto mt-12 p-5 rounded-xl border border-border bg-card/50 space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" /> Como funciona o pagamento
          </h3>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Escolha seu plano e clique em "Assinar via PIX"</li>
            <li>Copie o código PIX e realize o pagamento</li>
            <li>Envie o comprovante de pagamento</li>
            <li>Nossa equipe ativa seu plano em até 24h</li>
          </ol>
          <div className="text-xs text-muted-foreground pt-2 border-t border-border">
            Beneficiário: <strong>Geovanne Barboza Costa</strong> · Instituição: PagSeguro
          </div>
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v && step !== 3) setDialogOpen(false); else if (!v) { setDialogOpen(false); setStep(1); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {step === 1 && `Assinar Plano ${pix?.label} — ${formatBRL(pix?.amount ?? 0)}/mês`}
              {step === 2 && "Enviar comprovante"}
              {step === 3 && "Solicitação enviada!"}
            </DialogTitle>
            <DialogDescription>
              {step === 1 && "Realize o pagamento via PIX e depois envie o comprovante."}
              {step === 2 && "Envie a foto ou print do comprovante de pagamento."}
              {step === 3 && "Nossa equipe analisará seu pagamento em até 24 horas."}
            </DialogDescription>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Beneficiário</span>
                  <span className="font-medium">Geovanne Barboza Costa</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Instituição</span>
                  <span>PagSeguro</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-bold text-primary">{formatBRL(pix?.amount ?? 0)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Código PIX — Copia e Cola</div>
                <div className="bg-muted rounded-lg p-3 text-xs font-mono break-all leading-relaxed text-muted-foreground">
                  {pix?.code}
                </div>
                <Button
                  onClick={() => copyCode(pix?.code ?? "")}
                  className="w-full"
                  variant={copied ? "secondary" : "default"}
                >
                  {copied ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" /> Copiado!</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-2" /> Copiar código PIX</>
                  )}
                </Button>
              </div>

              <Button onClick={() => setStep(2)} variant="outline" className="w-full">
                Já efetuei o pagamento →
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 text-center">
                {proofUrl ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <div className="text-sm font-medium text-emerald-500">Comprovante enviado!</div>
                    <Button variant="ghost" size="sm" onClick={() => { setProofUrl(""); setProofName(""); }} className="text-destructive text-xs">
                      <X className="w-3 h-3 mr-1" /> Remover e enviar outro
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block space-y-2">
                    {isUploading ? (
                      <div className="space-y-2">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                        <div className="text-sm text-muted-foreground">Enviando... {progress > 0 ? `${progress}%` : ""}</div>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground" />
                        <div className="text-sm font-medium">Clique para enviar o comprovante</div>
                        <div className="text-xs text-muted-foreground">JPG, PNG ou PDF</div>
                      </>
                    )}
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={onPickProof} disabled={isUploading} />
                  </label>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Voltar
                </Button>
                <Button
                  onClick={submitSubscription}
                  disabled={!proofUrl || createSubscription.isPending}
                  className="flex-1"
                >
                  {createSubscription.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Confirmando...</>
                  ) : (
                    "Confirmar pagamento"
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-center py-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
              <div>
                <div className="font-semibold text-lg">Comprovante recebido!</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Nossa equipe irá verificar seu pagamento e ativar o Plano {pix?.label} em até 24 horas.
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                Você receberá uma confirmação quando seu plano for ativado. Em caso de dúvidas, entre em contato com o suporte.
              </div>
              <Button onClick={() => { setDialogOpen(false); setStep(1); }} className="w-full">
                Entendido
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
