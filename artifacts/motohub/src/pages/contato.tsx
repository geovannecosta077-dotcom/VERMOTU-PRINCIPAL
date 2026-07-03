import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export function Contato() {
  useEffect(() => { document.title = "Contato — MotoHub"; }, []);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Mensagem enviada! Entraremos em contato em breve.");
    setName(""); setEmail(""); setMsg("");
  };

  return (
    <Layout>
      <section className="container py-14">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3">Fale com a gente</h1>
        <p className="text-muted-foreground mb-10 max-w-2xl">Tire dúvidas, sugira melhorias ou peça suporte. Nossa equipe responde em até 1 dia útil.</p>

        <div className="grid md:grid-cols-[1.3fr_1fr] gap-8">
          <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-6">
            <div>
              <Label>Seu nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Como podemos te chamar?" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" />
            </div>
            <div>
              <Label>Mensagem</Label>
              <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} required rows={6} placeholder="Como podemos ajudar?" />
            </div>
            <Button type="submit" size="lg">Enviar mensagem</Button>
          </form>

          <div className="space-y-3">
            {[
              { icon: Mail, t: "E-mail", d: "contato@motohub.com.br" },
              { icon: MapPin, t: "Endereço", d: "Rio de Janeiro — RJ" },
              { icon: MessageCircle, t: "Suporte", d: "Use o chat dentro de cada anúncio para falar diretamente com o vendedor." },
            ].map((c) => (
              <div key={c.t} className="rounded-xl border border-border bg-card p-5 flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <c.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold">{c.t}</div>
                  <div className="text-sm text-muted-foreground">{c.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
