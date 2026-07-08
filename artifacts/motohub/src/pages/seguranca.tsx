import { useEffect } from "react";
import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { Shield, AlertTriangle, CheckCircle2, Phone, Lock, Eye, CreditCard, MessageCircle, UserCheck, Flag, Zap, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const GOLPES_COMUNS = [
  {
    titulo: "Pedido de PIX antes da entrega",
    descricao: "Nunca faça pagamento antecipado via PIX para quem você não conhece. Golpistas pedem pagamento e somem com o dinheiro.",
    nivel: "alto",
  },
  {
    titulo: "Anúncio com preço muito abaixo do mercado",
    descricao: "Se o preço parecer bom demais para ser verdade, provavelmente é golpe. Pesquise o valor de mercado antes de comprar.",
    nivel: "alto",
  },
  {
    titulo: "Vendedor que não quer mostrar a moto pessoalmente",
    descricao: "Vendedores legítimos aceitam mostrar a moto e deixar um mecânico inspecioná-la antes da venda.",
    nivel: "alto",
  },
  {
    titulo: "Solicitação de dados pessoais pelo chat",
    descricao: "Nunca envie CPF, dados bancários ou senha a ninguém pelo chat da plataforma.",
    nivel: "alto",
  },
  {
    titulo: "Link suspeito enviado por mensagem",
    descricao: "Desconfie de links enviados pelo chat pedindo para \"confirmar pagamento\" ou \"liberar entrega\".",
    nivel: "medio",
  },
  {
    titulo: "Troca com complemento em dinheiro",
    descricao: "Em trocas, não deposite nenhum valor adicional antes de ter a outra moto em mãos e documentada.",
    nivel: "medio",
  },
];

const DICAS_SEGURAS = [
  { icon: UserCheck, texto: "Verifique o perfil do vendedor: selos de verificação, avaliações e tempo no site." },
  { icon: Eye, texto: "Veja todas as fotos com atenção e peça fotos extras se necessário." },
  { icon: Phone, texto: "Converse pelo chat da plataforma — isso registra a negociação." },
  { icon: Lock, texto: "Use o sistema de pagamento seguro da plataforma sempre que possível." },
  { icon: CreditCard, texto: "Prefira cartão de crédito em transações: você tem direito a contestar cobranças indevidas." },
  { icon: MessageCircle, texto: "Combine a entrega pessoalmente em local seguro e público." },
];

export function Seguranca() {
  useEffect(() => { document.title = "Central de Segurança — Vermotu"; }, []);

  return (
    <Layout>
      <section className="container py-12 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Central de Segurança</h1>
            <p className="text-muted-foreground text-sm">Proteja-se de golpes e negocie com segurança</p>
          </div>
        </div>

        {/* Alert banner */}
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-amber-500">Atenção</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              A Vermotu <strong>nunca</strong> pede seu CPF, senha ou dados bancários por mensagem, e-mail ou WhatsApp.
              Se receber contato assim, é golpe — denuncie imediatamente.
            </p>
          </div>
        </div>

        {/* Golpes comuns */}
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" /> Golpes mais comuns
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GOLPES_COMUNS.map((g) => (
              <Card key={g.titulo} className="border-destructive/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <Badge
                      className={g.nivel === "alto"
                        ? "bg-red-500/15 text-red-500 hover:bg-red-500/15 text-[10px]"
                        : "bg-amber-500/15 text-amber-500 hover:bg-amber-500/15 text-[10px]"}
                    >
                      Risco {g.nivel === "alto" ? "ALTO" : "MÉDIO"}
                    </Badge>
                  </div>
                  <p className="font-semibold text-sm mb-1">{g.titulo}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{g.descricao}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Dicas de segurança */}
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Como negociar com segurança
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DICAS_SEGURAS.map(({ icon: Icon, texto }) => (
              <div key={texto} className="flex items-start gap-3 rounded-xl border border-border bg-card/50 p-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-sm leading-relaxed">{texto}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Denunciar */}
        <div className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-bold text-base flex items-center gap-2">
              <Flag className="w-5 h-5 text-primary" /> Encontrou algo suspeito?
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Denuncie anúncios ou usuários suspeitos diretamente na página do anúncio.
              Nossa equipe revisa todas as denúncias em menos de 24h.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button asChild variant="outline" className="gap-2">
              <Link href="/motos">
                <Zap className="w-4 h-4" /> Ver anúncios
              </Link>
            </Button>
            <Button asChild className="gap-2">
              <Link href="/contato">
                <Phone className="w-4 h-4" /> Falar com suporte
              </Link>
            </Button>
          </div>
        </div>

        {/* O que a Vermotu garante */}
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4">O que a Vermotu garante</h2>
          <div className="space-y-3">
            {[
              "Moderação de todos os anúncios antes de ficarem ativos",
              "Sistema de avaliações verificadas para vendedores",
              "Selos de verificação para usuários com identidade confirmada",
              "Suporte humano para dúvidas e conflitos",
              "Registro de todas as conversas na plataforma",
              "Pagamentos via Stripe com proteção contra fraude",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-10 text-center pb-4">
          <p className="text-xs text-muted-foreground">
            Leia também nossa{" "}
            <Link href="/privacidade" className="underline hover:text-primary">Política de Privacidade</Link>
            {" "}e nossos{" "}
            <Link href="/termos" className="underline hover:text-primary">Termos de Uso</Link>.
          </p>
        </div>
      </section>
    </Layout>
  );
}
