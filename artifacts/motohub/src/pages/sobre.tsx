import { useEffect } from "react";
import { Layout } from "@/components/layout";
import { Bike, ShieldCheck, Users, Rocket, Heart, Trophy } from "lucide-react";

export function Sobre() {
  useEffect(() => { document.title = "Sobre nós — MotoHub"; }, []);
  return (
    <Layout>
      <section className="bg-gradient-to-br from-red-950/40 via-black to-background border-b border-border">
        <div className="container py-20">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight">Sobre o <span className="text-primary">MotoHub</span></h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-2xl">
            Nascemos no Rio de Janeiro com uma missão clara: tornar a vida do motociclista brasileiro mais fácil, segura e conectada.
          </p>
        </div>
      </section>

      <section className="container py-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="text-3xl font-black mb-4">Nossa missão</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Reunir, em uma única plataforma, tudo o que o motociclista precisa: motos novas e usadas, peças originais, acessórios premium, oficinas verificadas e serviços rápidos.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Acreditamos que comprar e vender no mundo das motos pode (e deve) ser uma experiência confiável, transparente e digital — com pagamento protegido, suporte humano e a melhor tecnologia do mercado.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Users, label: "+50 mil", sub: "Motociclistas ativos" },
            { icon: Bike, label: "+15 mil", sub: "Anúncios publicados" },
            { icon: ShieldCheck, label: "100%", sub: "Pagamentos protegidos" },
            { icon: Trophy, label: "#1", sub: "Marketplace de motos no RJ" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-5">
              <s.icon className="w-6 h-6 text-primary mb-2" />
              <div className="text-2xl font-black">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-card border-y border-border">
        <div className="container py-16">
          <h2 className="text-3xl font-black mb-8 text-center">Nossos valores</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: ShieldCheck, t: "Confiança", d: "Vendedores e oficinas verificados, pagamento seguro e suporte 7 dias por semana." },
              { icon: Rocket, t: "Velocidade", d: "Negociação direta, entregas rápidas e checkout em 1 clique com Pix." },
              { icon: Heart, t: "Comunidade", d: "Feito por motociclistas, para motociclistas. Sua paixão é a nossa." },
            ].map((v) => (
              <div key={v.t} className="rounded-xl border border-border bg-background p-6">
                <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center mb-3">
                  <v.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold mb-1">{v.t}</h3>
                <p className="text-sm text-muted-foreground">{v.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
