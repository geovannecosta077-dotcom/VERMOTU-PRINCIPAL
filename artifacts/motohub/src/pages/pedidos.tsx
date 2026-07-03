import { useEffect } from "react";
import { Link, useSearch } from "wouter";
import { Layout } from "@/components/layout";
import { useSession, formatBRL, formatDateBR, imageUrl } from "@/lib/session";
import { useListOrders, getListOrdersQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Package, ChevronRight, CheckCircle2, Clock, Truck, XCircle } from "lucide-react";

const STATUS: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Aguardando pagamento", color: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30", icon: Clock },
  paid: { label: "Pagamento aprovado", color: "bg-blue-500/15 text-blue-500 border-blue-500/30", icon: CheckCircle2 },
  shipped: { label: "Enviado", color: "bg-indigo-500/15 text-indigo-500 border-indigo-500/30", icon: Truck },
  delivered: { label: "Entregue", color: "bg-green-500/15 text-green-500 border-green-500/30", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", color: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle },
};

export function Pedidos() {
  const currentUserId = useSession((s) => s.currentUserId);
  const setLoginOpen = useSession((s) => s.setLoginOpen);
  const search = useSearch();
  const justOrderId = new URLSearchParams(search).get("just");

  useEffect(() => { document.title = "Meus pedidos — MotoHub"; }, []);
  useEffect(() => { if (!currentUserId) setLoginOpen(true); }, [currentUserId, setLoginOpen]);

  const { data: orders } = useListOrders(
    { buyerId: currentUserId ?? 0 },
    { query: { enabled: !!currentUserId, queryKey: getListOrdersQueryKey({ buyerId: currentUserId ?? 0 }) } },
  );

  if (!currentUserId) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-muted-foreground mb-4">Entre para ver seus pedidos.</p>
          <Button onClick={() => setLoginOpen(true)}>Entrar</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-10">
        <h1 className="text-3xl font-black mb-2">Meus pedidos</h1>
        <p className="text-muted-foreground mb-8">Acompanhe e rastreie suas compras.</p>

        {justOrderId && (
          <div className="mb-6 p-4 rounded-xl border border-green-500/30 bg-green-500/5 text-sm flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Pedido <strong>#{justOrderId}</strong> realizado com sucesso! O vendedor já foi notificado.
          </div>
        )}

        {(orders ?? []).length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-16 text-center">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-6">Você ainda não fez nenhum pedido.</p>
            <Button asChild><Link href="/pecas">Começar a comprar</Link></Button>
          </div>
        ) : (
          <div className="space-y-4">
            {(orders ?? []).map((o) => {
              const s = STATUS[o.status] ?? STATUS.pending;
              const Icon = s.icon;
              return (
                <div key={o.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-border">
                    <div>
                      <div className="text-xs text-muted-foreground">Pedido #{o.id} · {formatDateBR(o.createdAt)}</div>
                      <div className="font-bold text-lg text-primary">{formatBRL(o.total)}</div>
                    </div>
                    <Badge className={`${s.color} border`}><Icon className="w-3 h-3 mr-1" /> {s.label}</Badge>
                  </div>
                  <div className="p-4 space-y-2">
                    {o.items.map((i) => (
                      <Link key={i.id} href={`/pecas/${i.itemId}`} className="flex gap-3 items-center hover-elevate rounded p-2 -mx-2">
                        <img src={imageUrl(i.image)} alt="" className="w-14 h-14 rounded object-cover bg-muted shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm line-clamp-1">{i.title}</div>
                          <div className="text-xs text-muted-foreground">Qtd: {i.qty} · {formatBRL(i.price)}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                    <span>Entrega: {o.shippingAddress}</span>
                    <span>·</span>
                    <span className="capitalize">Pagamento: {o.paymentMethod}</span>
                    {o.couponCode && <><span>·</span><span>Cupom {o.couponCode}</span></>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
