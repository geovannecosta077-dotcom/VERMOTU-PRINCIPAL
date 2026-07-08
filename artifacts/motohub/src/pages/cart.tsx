import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useCart, formatBRL, cartSubtotal, imageUrl } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, ShoppingBag, Minus, Plus, ShieldCheck } from "lucide-react";

export function Cart() {
  const { lines, remove, setQty, clear } = useCart();
  const [, setLocation] = useLocation();
  const subtotal = cartSubtotal(lines);

  useEffect(() => {
    document.title = "Carrinho — Vermotu";
  }, []);

  return (
    <Layout>
      <div className="container py-10">
        <h1 className="text-3xl font-black mb-2">Seu carrinho</h1>
        <p className="text-muted-foreground mb-8">
          {lines.length === 0 ? "Seu carrinho está vazio." : `${lines.length} item(ns) selecionado(s).`}
        </p>

        {lines.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-16 text-center">
            <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-6">Adicione peças e acessórios para continuar.</p>
            <Button asChild><Link href="/pecas">Explorar peças</Link></Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_360px] gap-8">
            <div className="space-y-3">
              {lines.map((l) => (
                <div key={l.itemId} className="flex gap-4 rounded-xl border border-border bg-card p-4">
                  <img src={imageUrl(l.image)} alt={l.title} className="w-24 h-24 rounded-lg object-cover bg-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Link href={`/pecas/${l.itemId}`} className="font-semibold hover:text-primary line-clamp-2">{l.title}</Link>
                    <div className="text-primary font-bold text-lg mt-1">{formatBRL(l.price)}</div>
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center border border-border rounded-md">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQty(l.itemId, l.qty - 1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <Input
                          type="number"
                          value={l.qty}
                          onChange={(e) => setQty(l.itemId, Number(e.target.value) || 1)}
                          className="h-8 w-12 text-center border-0 p-0"
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQty(l.itemId, l.qty + 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(l.itemId)}>
                        <Trash2 className="w-4 h-4 mr-1" /> Remover
                      </Button>
                    </div>
                  </div>
                  <div className="text-right font-bold whitespace-nowrap">{formatBRL(l.price * l.qty)}</div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={clear}>Limpar carrinho</Button>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 h-fit lg:sticky lg:top-20">
              <h2 className="font-bold text-lg mb-4">Resumo do pedido</h2>
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatBRL(subtotal)}</span>
              </div>
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-muted-foreground">Frete</span>
                <span className="font-medium text-green-500">Grátis no RJ</span>
              </div>
              <div className="border-t border-border my-3" />
              <div className="flex justify-between mb-5">
                <span className="font-bold">Total</span>
                <span className="font-black text-2xl text-primary">{formatBRL(subtotal)}</span>
              </div>
              <Button size="lg" className="w-full shadow-md shadow-primary/20" onClick={() => setLocation("/checkout")}>
                Finalizar compra
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-3 flex items-center gap-1 justify-center">
                <ShieldCheck className="w-3 h-3" /> Pagamento seguro · Pix · Cartão · Boleto
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
