import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useCart, useSession, formatBRL, cartSubtotal, imageUrl } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useGetUser, useValidateCoupon, useCreateOrder, getGetUserQueryKey } from "@workspace/api-client-react";
import type { Coupon } from "@workspace/api-client-react";
import { toast } from "sonner";
import { CreditCard, FileText, Tag, ChevronLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { SiPix } from "react-icons/si";

type Method = "pix" | "card" | "boleto";

export function Checkout() {
  const [, setLocation] = useLocation();
  const currentUserId = useSession((s) => s.currentUserId);
  const { lines, clear } = useCart();
  const subtotal = cartSubtotal(lines);
  const [method, setMethod] = useState<Method>("pix");
  const [address, setAddress] = useState("");
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const setLoginOpen = useSession((s) => s.setLoginOpen);
  const validate = useValidateCoupon();
  const createOrder = useCreateOrder();

  const { data: user } = useGetUser(currentUserId ?? 0, {
    query: { enabled: !!currentUserId, queryKey: getGetUserQueryKey(currentUserId ?? 0) },
  });

  useEffect(() => {
    document.title = "Checkout — Vermotu";
    if (!currentUserId) setLoginOpen(true);
    if (user) setAddress((a) => a || `${user.city || "Rio de Janeiro"}, RJ`);
  }, [currentUserId, user]);

  if (lines.length === 0) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <p className="text-muted-foreground mb-6">Seu carrinho está vazio.</p>
          <Button asChild><Link href="/pecas">Voltar às compras</Link></Button>
        </div>
      </Layout>
    );
  }

  const total = Math.max(0, subtotal - (appliedCoupon?.discount ?? 0));

  const applyCoupon = () => {
    if (!coupon) return;
    validate.mutate(
      { data: { code: coupon, subtotal } },
      {
        onSuccess: (r) => {
          if (r.valid) {
            setAppliedCoupon({ code: (r.coupon as Coupon).code, discount: r.discount });
            toast.success(r.message ?? "Cupom aplicado!");
          } else {
            setAppliedCoupon(null);
            toast.error(r.message ?? "Cupom inválido");
          }
        },
      },
    );
  };

  const submit = () => {
    if (!currentUserId) { setLoginOpen(true); return; }
    if (!address.trim()) { toast.error("Informe um endereço de entrega"); return; }
    createOrder.mutate(
      {
        data: {
          buyerId: currentUserId,
          paymentMethod: method,
          shippingAddress: address,
          couponCode: appliedCoupon?.code ?? null,
          lines: lines.map((l) => ({ itemId: l.itemId, qty: l.qty })),
        },
      },
      {
        onSuccess: (order) => {
          clear();
          toast.success("Pedido realizado com sucesso!");
          setLocation(`/pedidos?just=${order.id}`);
        },
        onError: () => toast.error("Falha ao finalizar pedido"),
      },
    );
  };

  return (
    <Layout>
      <div className="container py-10">
        <Button variant="ghost" size="sm" onClick={() => history.back()} className="mb-4">
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <h1 className="text-3xl font-black mb-8">Finalizar pedido</h1>

        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          <div className="space-y-6">
            {/* Endereço */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-bold mb-4">1. Endereço de entrega</h2>
              <Label htmlFor="addr">Endereço completo</Label>
              <Textarea id="addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, complemento, bairro, cidade — CEP" rows={3} className="mt-1" />
            </div>

            {/* Pagamento */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-bold mb-4">2. Forma de pagamento</h2>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { id: "pix" as Method, icon: SiPix, label: "Pix", note: "Aprovação imediata" },
                  { id: "card" as Method, icon: CreditCard, label: "Cartão", note: "Em até 12x" },
                  { id: "boleto" as Method, icon: FileText, label: "Boleto", note: "Compensa em 1-2 dias" },
                ]).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`rounded-lg border p-4 text-left transition-colors ${method === m.id ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/50"}`}
                  >
                    <m.icon className="w-6 h-6 mb-2 text-primary" />
                    <div className="font-semibold">{m.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{m.note}</div>
                  </button>
                ))}
              </div>
              {method === "pix" && (
                <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/30 text-sm">
                  <strong>Pix Vermotu</strong> — após confirmar, exibimos o QR Code. Pagamento aprovado na hora.
                </div>
              )}
            </div>

            {/* Cupom */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-bold mb-4 flex items-center gap-2"><Tag className="w-4 h-4" /> Cupom de desconto</h2>
              <div className="flex gap-2">
                <Input placeholder="Ex: MOTOHUB10" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} />
                <Button onClick={applyCoupon} disabled={validate.isPending || !coupon}>Aplicar</Button>
              </div>
              {appliedCoupon && (
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-green-500">
                    <CheckCircle2 className="w-4 h-4" /> Cupom <strong>{appliedCoupon.code}</strong> aplicado
                  </span>
                  <span className="font-bold text-green-500">-{formatBRL(appliedCoupon.discount)}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">Se você tem um cupom de desconto, insira o código acima.</p>
            </div>
          </div>

          {/* Resumo */}
          <div className="rounded-xl border border-border bg-card p-6 h-fit lg:sticky lg:top-20">
            <h2 className="font-bold text-lg mb-4">Resumo</h2>
            <div className="space-y-2 mb-4 max-h-60 overflow-auto">
              {lines.map((l) => (
                <div key={l.itemId} className="flex gap-2 text-sm">
                  <img src={imageUrl(l.image)} alt="" className="w-12 h-12 rounded object-cover bg-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="line-clamp-1">{l.title}</div>
                    <div className="text-xs text-muted-foreground">Qtd: {l.qty}</div>
                  </div>
                  <div className="font-medium whitespace-nowrap">{formatBRL(l.price * l.qty)}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatBRL(subtotal)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-green-500">
                  <span>Desconto</span>
                  <span>-{formatBRL(appliedCoupon.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frete</span>
                <span className="text-green-500">Grátis</span>
              </div>
            </div>
            <div className="border-t border-border my-3" />
            <div className="flex justify-between mb-5">
              <span className="font-bold">Total</span>
              <span className="font-black text-2xl text-primary">{formatBRL(total)}</span>
            </div>
            <Button size="lg" className="w-full shadow-md shadow-primary/20" onClick={submit} disabled={createOrder.isPending}>
              Confirmar e pagar
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3 flex items-center gap-1 justify-center">
              <ShieldCheck className="w-3 h-3" /> Compra 100% protegida
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
