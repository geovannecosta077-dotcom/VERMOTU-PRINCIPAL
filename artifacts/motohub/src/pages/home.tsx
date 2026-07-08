import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import { useListItems, useListBanners, useListBlogPosts, getListBannersQueryKey, getListBlogPostsQueryKey } from "@workspace/api-client-react";
import { ItemCard } from "@/components/item-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bike,
  HardHat,
  CircleDot,
  Wind,
  Zap,
  Droplet,
  Wrench,
  RefreshCw,
  ShoppingBag,
  Store,
  MapPin,
  ShieldCheck,
  Truck,
  HeadphonesIcon,
  Star,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Tag,
  Flame,
  Newspaper,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import motoImg from "@/assets/categories/moto.png";
import capaceteImg from "@/assets/categories/capacete.png";
import pneuImg from "@/assets/categories/pneu.png";
import escapamentoImg from "@/assets/categories/escapamento.png";
import eletricaImg from "@/assets/categories/eletrica.png";
import oleoImg from "@/assets/categories/oleo.png";
import oficinaImg from "@/assets/categories/oficina.png";
import trocaImg from "@/assets/categories/troca.png";

const CATEGORY_CARDS = [
  {
    key: "motos",
    label: "Motos",
    sub: "Comprar e vender",
    href: "/motos",
    img: motoImg,
    from: "#7f1d1d",
    to: "#dc2626",
  },
  {
    key: "capacete",
    label: "Capacetes",
    sub: "Proteção e estilo",
    href: "/pecas?cat=capacete",
    img: capaceteImg,
    from: "#78350f",
    to: "#ea580c",
  },
  {
    key: "pneu",
    label: "Pneus",
    sub: "Todas as medidas",
    href: "/pecas?cat=pneu",
    img: pneuImg,
    from: "#1c1917",
    to: "#44403c",
  },
  {
    key: "escapamento",
    label: "Escapamentos",
    sub: "Performance",
    href: "/pecas?cat=escapamento",
    img: escapamentoImg,
    from: "#1e293b",
    to: "#475569",
  },
  {
    key: "eletrica",
    label: "Elétrica",
    sub: "Peças e kits",
    href: "/pecas?cat=eletrica",
    img: eletricaImg,
    from: "#713f12",
    to: "#ca8a04",
  },
  {
    key: "oleo",
    label: "Óleos e filtros",
    sub: "Manutenção",
    href: "/pecas?cat=oleo",
    img: oleoImg,
    from: "#14532d",
    to: "#16a34a",
  },
  {
    key: "oficina",
    label: "Oficinas",
    sub: "Mecânicos parceiros",
    href: "/oficinas",
    img: oficinaImg,
    from: "#1e3a5f",
    to: "#2563eb",
  },
  {
    key: "troca",
    label: "Troca de peças",
    sub: "Rápido e seguro",
    href: "/oficinas?cat=troca",
    img: trocaImg,
    from: "#3b0764",
    to: "#7c3aed",
  },
];

const steps = [
  { n: "01", title: "Encontre", text: "Busque motos, peças e oficinas perto de você com filtros inteligentes." },
  { n: "02", title: "Negocie", text: "Fale direto com o vendedor pelo chat ou WhatsApp, sem intermediários." },
  { n: "03", title: "Pague seguro", text: "Pix, cartão ou boleto com proteção Vermotu e cashback patrocinado." },
  { n: "04", title: "Receba e avalie", text: "Acompanhe o pedido em tempo real e avalie sua experiência." },
];

const BLOG_CATEGORIES_LABELS: Record<string, string> = {
  manutencao: "Manutenção",
  seguranca: "Segurança",
  noticias: "Notícias",
  analises: "Análises",
  customizacao: "Customização",
  geral: "Geral",
};

function HeroBannerCarousel() {
  const { data: banners } = useListBanners({}, { query: { staleTime: 30_000, queryKey: getListBannersQueryKey({}) } });
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slides = (banners ?? []).filter((b) => b.active);
  const hasSlides = slides.length > 0;

  const go = useCallback((nextIdx: number, direction: number) => {
    setDir(direction);
    setActive(nextIdx);
  }, []);

  const next = useCallback(() => {
    if (!hasSlides) return;
    go((active + 1) % slides.length, 1);
  }, [active, slides.length, hasSlides, go]);

  const prev = useCallback(() => {
    if (!hasSlides) return;
    go((active - 1 + slides.length) % slides.length, -1);
  }, [active, slides.length, hasSlides, go]);

  useEffect(() => {
    if (!hasSlides || slides.length < 2) return;
    const dur = (slides[active]?.durationSecs ?? 6) * 1000;
    timerRef.current = setTimeout(() => {
      go((active + 1) % slides.length, 1);
    }, dur);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [active, hasSlides, slides, go]);

  if (hasSlides) {
    const slide = slides[active]!;
    return (
      <section className="relative min-h-[600px] md:min-h-[680px] flex items-center overflow-hidden bg-black select-none">
        <AnimatePresence initial={false} custom={dir}>
          <motion.div
            key={active}
            custom={dir}
            variants={{
              enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "tween", duration: 0.55, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {slide.imageUrl ? (
              <img src={slide.imageUrl} alt={slide.title} className="absolute inset-0 w-full h-full object-cover opacity-60" />
            ) : (
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${slide.bgColor}44, ${slide.bgColor}88)` }} />
            )}
            <div className="absolute inset-0 bg-gradient-to-br from-black via-black/70 to-transparent z-10" />
            <div
              className="absolute inset-0 z-10 opacity-[0.05]"
              style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
          </motion.div>
        </AnimatePresence>

        <div className="container relative z-20 py-20">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={`text-${active}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.45, delay: 0.15 }}
              className="max-w-3xl"
            >
              <Badge className="mb-5 bg-primary/15 border border-primary/40 text-primary hover:bg-primary/20 px-3 py-1">
                <Bike className="w-3.5 h-3.5 mr-1.5" /> #1 marketplace de motos do Brasil
              </Badge>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-5 text-white leading-[0.95]">
                {slide.title}
              </h1>
              {slide.subtitle && (
                <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl">{slide.subtitle}</p>
              )}
              {slide.ctaText && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button size="lg" className="text-base px-8 h-12 shadow-lg shadow-primary/30" asChild>
                    <Link href={slide.ctaUrl}>{slide.ctaText}</Link>
                  </Button>
                  <Button size="lg" variant="outline" className="text-base px-8 h-12 bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white" asChild>
                    <Link href="/anunciar"><Store className="w-4 h-4 mr-2" /> Anunciar grátis</Link>
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Arrows */}
        {slides.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">
              {slides.map((_, i) => (
                <button key={i} onClick={() => go(i, i > active ? 1 : -1)}
                  className={`h-1.5 rounded-full transition-all ${i === active ? "w-8 bg-primary" : "w-2 bg-white/40 hover:bg-white/70"}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Trust bar */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/40 backdrop-blur-sm border-t border-white/10">
          <div className="container py-3 flex flex-wrap justify-center md:justify-start gap-6 text-sm text-gray-400">
            <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Pagamento protegido</span>
            <span className="flex items-center gap-2"><Truck className="w-4 h-4 text-primary" /> Entrega rápida no RJ</span>
            <span className="flex items-center gap-2"><HeadphonesIcon className="w-4 h-4 text-primary" /> Suporte 7 dias</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-[600px] md:min-h-[700px] flex items-center overflow-hidden bg-black">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-black/85 to-red-950/40 z-10" />
      <img src="/images/hero.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
      <div
        className="absolute inset-0 z-10 opacity-[0.05]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />
      {/* Glow accent */}
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl z-10 pointer-events-none" />
      <div className="container relative z-20 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Badge className="mb-5 bg-primary/15 border border-primary/40 text-primary hover:bg-primary/20 px-3 py-1.5 text-xs">
              <Bike className="w-3.5 h-3.5 mr-1.5" /> #1 marketplace de motos do Brasil
            </Badge>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter mb-5 text-white leading-[0.93]"
          >
            Tudo para sua moto<br />
            <span className="bg-gradient-to-r from-primary via-red-500 to-red-400 bg-clip-text text-transparent">em um só lugar.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="text-base md:text-xl text-gray-300 mb-8 max-w-xl leading-relaxed"
          >
            Compre peças, venda sua moto, encontre oficinas perto de você. PIX, cartão e WhatsApp integrados.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.38 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Button size="lg" className="text-base px-7 h-13 shadow-xl shadow-primary/30 font-semibold" asChild>
              <Link href="/pecas"><ShoppingBag className="w-4 h-4 mr-2" /> Comprar peças</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-base px-7 h-13 bg-white/10 border-white/25 text-white hover:bg-white/20 hover:text-white font-semibold" asChild>
              <Link href="/anunciar"><Store className="w-4 h-4 mr-2" /> Vender peças</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-base px-7 h-13 bg-white/10 border-white/25 text-white hover:bg-white/20 hover:text-white font-semibold" asChild>
              <Link href="/oficinas"><Wrench className="w-4 h-4 mr-2" /> Oficinas</Link>
            </Button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.55 }}
            className="flex flex-wrap gap-5 mt-10 text-sm text-gray-400"
          >
            {[
              { icon: ShieldCheck, text: "PIX, cartão e boleto" },
              { icon: Truck, text: "Entrega rápida no RJ" },
              { icon: HeadphonesIcon, text: "Suporte 7 dias" },
            ].map(({ icon: Icon, text }, i) => (
              <motion.span
                key={text}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.6 + i * 0.1 }}
                className="flex items-center gap-2"
              >
                <Icon className="w-4 h-4 text-primary shrink-0" /> {text}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export function Home() {
  useEffect(() => {
    document.title = "Vermotu — Tudo para sua moto em um só lugar";
  }, []);

  const { data: motos, isLoading: motosLoading } = useListItems({ type: "moto" });
  const { data: pecas, isLoading: pecasLoading } = useListItems({ type: "peca" });
  const { data: servicos } = useListItems({ type: "servico" });
  const { data: blogPosts } = useListBlogPosts({ published: true }, { query: { staleTime: 60_000, queryKey: getListBlogPostsQueryKey({ published: true }) } });

  const featuredMotos = (motos ?? []).slice(0, 4);
  const featuredPecas = (pecas ?? []).slice(0, 4);
  const featuredOficinas = (servicos ?? []).slice(0, 3);
  const promos = [...(pecas ?? []), ...(motos ?? [])].slice(0, 4);
  const latestPosts = (blogPosts ?? []).slice(0, 3);

  const EmptyState = ({ message }: { message: string }) => (
    <div className="col-span-full rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
      <Store className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
      <p className="text-muted-foreground mb-4">{message}</p>
      <Button asChild>
        <Link href="/anunciar">Criar primeiro anúncio</Link>
      </Button>
    </div>
  );

  return (
    <Layout>
      {/* HERO BANNER CAROUSEL */}
      <HeroBannerCarousel />

      {/* CATEGORIES */}
      <section className="container py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">Categorias principais</h2>
            <p className="text-muted-foreground mt-2">Tudo o que sua moto precisa, organizado para você.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          {CATEGORY_CARDS.map((c) => (
            <Link key={c.key} href={c.href}>
              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 350, damping: 22 }}
                className="group relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-2xl transition-shadow border border-white/5"
              >
                {/* Photo background */}
                <div
                  className="absolute inset-0"
                  style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
                />
                <img
                  src={c.img}
                  alt={c.label}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-60 group-hover:scale-105 transition-all duration-500"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                {/* Dark overlay gradient at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                  <div className="font-bold text-white text-sm md:text-base leading-tight">{c.label}</div>
                  <div className="text-white/60 text-[11px] md:text-xs mt-0.5 hidden sm:block">{c.sub}</div>
                </div>

                {/* Arrow on hover */}
                <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/0 group-hover:bg-white/20 flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100">
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>

      {/* PROMOS */}
      <section className="bg-gradient-to-r from-red-950/40 via-black to-red-950/40 border-y border-primary/20">
        <div className="container py-14">
          <div className="flex items-end justify-between mb-8">
            <div>
              <Badge className="bg-primary/20 text-primary border border-primary/40 mb-2"><Flame className="w-3 h-3 mr-1" /> Em destaque</Badge>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">Anúncios recentes</h2>
              <p className="text-gray-400 mt-2">Os últimos itens publicados pelos vendedores.</p>
            </div>
            <Link href="/pecas" className="hidden md:flex items-center gap-1 text-sm text-primary hover:underline">
              Ver tudo <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pecasLoading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)
              : promos.length === 0
                ? <EmptyState message="Ainda não há anúncios publicados." />
                : promos.map((it) => <ItemCard key={it.id} item={it} />)}
          </div>
        </div>
      </section>

      {/* FEATURED MOTOS */}
      <section className="container py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">Motos em destaque</h2>
            <p className="text-muted-foreground mt-2">Anúncios verificados de vendedores parceiros.</p>
          </div>
          <Link href="/motos" className="hidden md:flex items-center gap-1 text-sm text-primary hover:underline">
            Ver todas <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {motosLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)
            : featuredMotos.length === 0
              ? <EmptyState message="Ainda não há motos anunciadas." />
              : featuredMotos.map((it) => <ItemCard key={it.id} item={it} />)}
        </div>
      </section>

      {/* PECAS */}
      <section className="container py-4 pb-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">Peças e acessórios</h2>
            <p className="text-muted-foreground mt-2">Originais, premium e compatíveis com sua moto.</p>
          </div>
          <Link href="/pecas" className="hidden md:flex items-center gap-1 text-sm text-primary hover:underline">
            Ver todas <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pecasLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)
            : featuredPecas.length === 0
              ? <EmptyState message="Ainda não há peças anunciadas." />
              : featuredPecas.map((it) => <ItemCard key={it.id} item={it} />)}
        </div>
      </section>

      {/* PITSTOP MOTOHUB — blog section */}
      <section className="bg-card border-y border-border">
        <div className="container py-14">
          <div className="flex items-end justify-between mb-8">
            <div>
              <Badge variant="outline" className="mb-2 border-primary/30 text-primary gap-1.5">
                <Newspaper className="w-3 h-3" /> PitStop Vermotu
              </Badge>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight">Conteúdo exclusivo para motociclistas</h2>
              <p className="text-muted-foreground mt-2">Dicas, análises, segurança e as últimas novidades do mundo moto.</p>
            </div>
            <Link href="/blog" className="hidden md:flex items-center gap-1 text-sm text-primary hover:underline">
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {latestPosts.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  cat: "Manutenção", title: "5 sinais de que sua moto precisa de revisão urgente",
                  img: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600&q=80",
                },
                {
                  cat: "Segurança", title: "Equipamentos obrigatórios: o que a lei exige em 2026",
                  img: "https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=600&q=80",
                },
                {
                  cat: "Análises", title: "Honda CG vs Yamaha Factor: qual escolher?",
                  img: "https://images.unsplash.com/photo-1547549082-6bc09f2049ae?w=600&q=80",
                },
              ].map((p) => (
                <Link key={p.title} href="/blog">
                  <motion.div whileHover={{ y: -4 }} className="group rounded-2xl border border-border bg-background overflow-hidden cursor-pointer hover:border-primary/40 transition-colors">
                    <div className="aspect-[16/9] bg-muted overflow-hidden">
                      <img
                        src={p.img}
                        alt={p.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          const t = e.currentTarget.parentElement!;
                          t.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-red-950/30"><svg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'1.5\' class=\'text-primary/40\'><path d=\'M4 19.5A2.5 2.5 0 0 1 6.5 17H20\'/><path d=\'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z\'/></svg></div>';
                        }}
                      />
                    </div>
                    <div className="p-5">
                      <Badge variant="outline" className="mb-3 text-xs border-primary/30 text-primary">{p.cat}</Badge>
                      <h3 className="font-bold text-base group-hover:text-primary transition-colors leading-snug">{p.title}</h3>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> Leia no blog Vermotu
                      </p>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {latestPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`}>
                  <motion.div whileHover={{ y: -4 }} className="group rounded-2xl border border-border bg-background overflow-hidden cursor-pointer hover:border-primary/40 transition-colors">
                    <div className="aspect-[16/9] bg-gradient-to-br from-primary/10 to-red-950/30 overflow-hidden">
                      {post.coverImageUrl
                        ? <img src={post.coverImageUrl} alt={post.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        : <div className="w-full h-full flex items-center justify-center"><Newspaper className="w-12 h-12 text-primary/30" /></div>
                      }
                    </div>
                    <div className="p-5">
                      <Badge variant="outline" className="mb-3 text-xs border-primary/30 text-primary">
                        {BLOG_CATEGORIES_LABELS[post.category] ?? post.category}
                      </Badge>
                      <h3 className="font-bold text-base group-hover:text-primary transition-colors leading-snug line-clamp-2">{post.title}</h3>
                      {post.excerpt && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{post.excerpt}</p>}
                      <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> {post.authorName || "Equipe Vermotu"}
                      </p>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <Button variant="outline" asChild>
              <Link href="/blog"><BookOpen className="w-4 h-4 mr-2" /> Ver todos os artigos</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* OFICINAS */}
      <section className="container py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <Badge variant="outline" className="mb-2"><MapPin className="w-3 h-3 mr-1" /> Rio de Janeiro</Badge>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">Oficinas perto de você</h2>
            <p className="text-muted-foreground mt-2">Mecânicos verificados, com preço justo e atendimento rápido.</p>
          </div>
          <Link href="/oficinas" className="hidden md:flex items-center gap-1 text-sm text-primary hover:underline">
            Ver todas <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredOficinas.length === 0
            ? <EmptyState message="Ainda não há oficinas cadastradas." />
            : featuredOficinas.map((it) => <ItemCard key={it.id} item={it} />)}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-card border-y border-border">
        <div className="container py-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">Como funciona</h2>
            <p className="text-muted-foreground mt-3">Comprar e vender na Vermotu é rápido, fácil e seguro.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative rounded-2xl border border-border bg-background p-6 hover:border-primary/40 hover:shadow-lg transition-all"
              >
                <div className="text-5xl font-black text-primary/15 mb-3">{s.n}</div>
                <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SELLERS */}
      <section className="container py-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-950 via-black to-red-900 border border-primary/30 p-10 md:p-14 text-center">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle at 20% 50%, rgba(239,68,68,.5), transparent 40%), radial-gradient(circle at 80% 50%, rgba(239,68,68,.4), transparent 40%)",
            }}
          />
          <div className="relative">
            <Badge className="mb-5 bg-primary/20 text-primary border border-primary/40"><Tag className="w-3 h-3 mr-1" /> Anuncie agora</Badge>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-4">
              Tem moto, peça ou oficina? <br className="hidden md:block" />
              <span className="text-primary">Venda mais com a Vermotu.</span>
            </h2>
            <p className="text-gray-300 max-w-xl mx-auto mb-8">
              Crie sua loja em 2 minutos, receba pedidos via Pix e fale com clientes pelo WhatsApp. Plano grátis para começar.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="text-base px-8 h-12 shadow-lg shadow-primary/40" asChild>
                <Link href="/anunciar">Anunciar grátis</Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 h-12 bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white" asChild>
                <Link href="/planos">Ver planos premium</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BADGES */}
      <section className="border-t border-border/40 bg-card/30">
        <div className="container py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: ShieldCheck, label: "Pagamento protegido", desc: "Pix, cartão ou boleto" },
              { icon: Truck, label: "Entrega rápida", desc: "Todo o Rio de Janeiro" },
              { icon: Star, label: "Vendedores verificados", desc: "Perfis com avaliações" },
              { icon: HeadphonesIcon, label: "Suporte 7 dias", desc: "Sempre disponível" },
            ].map((t) => (
              <div key={t.label} className="flex flex-col items-center gap-2 p-4">
                <t.icon className="w-7 h-7 text-primary" />
                <div className="font-semibold text-sm">{t.label}</div>
                <div className="text-xs text-muted-foreground">{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
