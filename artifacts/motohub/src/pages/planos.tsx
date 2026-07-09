import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { useSession, formatBRL } from "@/lib/session";
import {
  useGetUser,
  useListSubscriptions,
  useCreateSubscriptionCheckout,
  getGetUserQueryKey,
  getListSubscriptionsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check, Crown, Loader2, CheckCircle2, Clock, CreditCard,
} from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  awaiting_payment: { label: "Aguardando pagamento", color: "bg-amber-500/15 text-amber-500" },
  proof_submitted: { label: "Comprovante enviado — em análise", color: "bg-blue-500/15 text-blue-500" },
  in_review: { label: "Em análise", color: "bg-purple-500/15 text-purple-500" },
  approved: { label: "Aprovado", color: "bg-emerald-500/15 text-emerald-500" },
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
  const createSubscriptionCheckout = useCreateSubscriptionCheckout();
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<"pro" | "premium" | null>(null);

  useEffect(() => { document.title = "Planos — Vermotu"; }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("checkout");
    if (checkoutStatus === "success") {
      toast.success("Pagamento confirmado! Seu plano será ativado em instantes.");
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: getListSubscriptionsQueryKey({ userId: currentUserId }) });
        queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(currentUserId) });
      }
      window.history.replaceState({}, "", window.location.pathname);
    } else if (checkoutStatus === "cancel") {
      toast.info("Pagamento cancelado.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [currentUserId, queryClient]);

  const pendingSub = (subscriptions ?? []).find((s) => ["awaiting_payment", "proof_submitted", "in_review", "approved"].includes(s.status));

  const handleStripeCheckout = (plan: "pro" | "premium") => {
    if (!currentUserId) { setLoginOpen(true); return; }
    setCheckoutLoadingPlan(plan);
    createSubscriptionCheckout.mutate(
      { data: { userId: currentUserId, plan } },
      {
        onSuccess: (session) => { window.location.href = session.url; },
        onError: () => {
          toast.error("Erro ao iniciar pagamento. Tente novamente.");
          setCheckoutLoadingPlan(null);
        },
      },
    );
  };

  return (
    <Layout>
      <section className="container py-12">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-4xl font-bold mb-3">Planos premium</h1>
          <p className="text-muted-foreground text-lg">
            Mais visibilidade, mais vendas. Assine com cartão de crédito e ative na hora.
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
                      onClick={() => handleStripeCheckout(p.id)}
                      disabled={isCurrent || !!hasPending || checkoutLoadingPlan === p.id}
                    >
                      {checkoutLoadingPlan === p.id ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecionando...</>
                      ) : isCurrent ? (
                        "Plano atual"
                      ) : hasPending ? (
                        pendingSub?.status === "approved" ? "Plano ativo" : "Aguardando confirmação"
                      ) : (
                        <><CreditCard className="w-4 h-4 mr-2" /> Assinar com cartão</>
                      )}
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
            <li>Clique em "Assinar com cartão" no plano desejado</li>
            <li>Você será redirecionado para a página segura de pagamento do Stripe</li>
            <li>Após o pagamento confirmado, seu plano é ativado imediatamente</li>
          </ol>
          <div className="text-xs text-muted-foreground pt-2 border-t border-border">
            Pagamentos processados com segurança pelo Stripe. Cancele a qualquer momento.
          </div>
        </div>
      </section>
    </Layout>
  );
}
