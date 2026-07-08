import { useEffect, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { Layout } from "@/components/layout";
import {
  useGetItem,
  useGetUser,
  useToggleFavorite,
  useListFavorites,
  useCreateConversation,
  useCreateAppointment,
  useListReviews,
  useCreateReview,
  useCreateReport,
  useTrackEvent,
  getListFavoritesQueryKey,
  getListConversationsQueryKey,
  getListAppointmentsQueryKey,
  getListReviewsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, MessageCircle, MapPin, Calendar, Gauge, Cog, ChevronLeft, ChevronRight, CalendarPlus, ShoppingCart, Star, ShieldCheck, Truck, Package, Flag, Check } from "lucide-react";
import { useSession, useCart, formatBRL, formatDateBR, formatRelative, whatsappLink, imageUrl, parseImages, getAnonSessionId } from "@/lib/session";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiWhatsapp } from "react-icons/si";

export function ItemDetail() {
  const [, params] = useRoute("/:section/:id");
  const id = Number(params?.id);
  const [, setLocation] = useLocation();
  const currentUserId = useSession((s) => s.currentUserId);
  const addToCart = useCart((s) => s.add);
  const setLoginOpen = useSession((s) => s.setLoginOpen);
  const [activeImg, setActiveImg] = useState(0);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const queryClient = useQueryClient();

  const { data: item, isLoading } = useGetItem(id, {
    query: { enabled: !!id, queryKey: ["item", id] as readonly unknown[] },
  });
  const { data: seller } = useGetUser(item?.sellerId ?? 0, {
    query: { enabled: !!item?.sellerId, queryKey: ["user", item?.sellerId ?? 0] as readonly unknown[] },
  });
  const { data: favorites } = useListFavorites(
    { userId: currentUserId ?? 0 },
    { query: { enabled: !!currentUserId, queryKey: getListFavoritesQueryKey({ userId: currentUserId ?? 0 }) } },
  );
  const { data: reviews } = useListReviews(
    { itemId: id },
    { query: { enabled: !!id, queryKey: getListReviewsQueryKey({ itemId: id }) } },
  );

  const isFavorite = (favorites ?? []).includes(id);
  const toggleFav = useToggleFavorite();
  const createConv = useCreateConversation();
  const createAppt = useCreateAppointment();
  const createRev = useCreateReview();
  const createReport = useCreateReport();
  const trackEvent = useTrackEvent();

  const track = (eventType: "view" | "click" | "favorite" | "unfavorite" | "share" | "contact", targetType: "item" | "company", targetId: number) =>
    trackEvent.mutate({
      data: { userId: currentUserId ?? null, sessionId: getAnonSessionId(), eventType, targetType, targetId },
    });

  useEffect(() => {
    if (item) document.title = `${item.title} — Vermotu`;
  }, [item]);

  useEffect(() => {
    if (item) track("view", "item", item.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  if (isLoading || !item) {
    return (
      <Layout>
        <div className="container py-10">
          <Skeleton className="h-96 w-full rounded-xl mb-6" />
          <Skeleton className="h-10 w-1/2 mb-4" />
          <Skeleton className="h-6 w-1/3" />
        </div>
      </Layout>
    );
  }

  const requireLogin = (cb: () => void) => {
    if (!currentUserId) { setLoginOpen(true); return; }
    cb();
  };

  const handleFavorite = () =>
    requireLogin(() => {
      toggleFav.mutate(
        { data: { userId: currentUserId!, itemId: item.id } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListFavoritesQueryKey({ userId: currentUserId! }) });
            track(isFavorite ? "unfavorite" : "favorite", "item", item.id);
            toast.success(isFavorite ? "Removido dos favoritos" : "Adicionado aos favoritos");
          },
        },
      );
    });

  const handleContact = () =>
    requireLogin(() => {
      if (currentUserId === item.sellerId) {
        toast.info("Você é o vendedor deste anúncio.");
        return;
      }
      createConv.mutate(
        { data: { itemId: item.id, buyerId: currentUserId!, sellerId: item.sellerId } },
        {
          onSuccess: (conv) => {
            queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey({ userId: currentUserId! }) });
            track("contact", "item", item.id);
            track("contact", "company", item.sellerId);
            setLocation(`/chat/${conv.id}`);
          },
        },
      );
    });

  const handleSchedule = () => requireLogin(() => setScheduleOpen(true));

  const submitSchedule = () => {
    if (!scheduleDate) return;
    createAppt.mutate(
      { data: { serviceId: item.id, userId: currentUserId!, date: new Date(scheduleDate).toISOString() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey({ userId: currentUserId! }) });
          setScheduleOpen(false);
          toast.success("Agendamento realizado!");
          setScheduleDate("");
        },
      },
    );
  };

  const handleAddToCart = () => {
    if (item.stock === 0) {
      toast.error("Produto esgotado");
      return;
    }
    addToCart({
      itemId: item.id,
      title: item.title,
      image: item.image,
      price: item.price,
      qty: 1,
      sellerId: item.sellerId,
    });
    toast.success("Adicionado ao carrinho!");
  };

  const handleBuyNow = () => {
    handleAddToCart();
    requireLogin(() => setLocation("/carrinho"));
  };

  const handleSubmitReview = () => {
    if (!currentUserId) { setLoginOpen(true); return; }
    createRev.mutate(
      { data: { itemId: item.id, userId: currentUserId, rating, comment: comment || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReviewsQueryKey({ itemId: item.id }) });
          queryClient.invalidateQueries({ queryKey: ["item", item.id] });
          setReviewOpen(false);
          setComment("");
          setRating(5);
          toast.success("Avaliação enviada!");
        },
      },
    );
  };

  const wa = seller?.phone
    ? whatsappLink(seller.phone, `Olá! Tenho interesse no seu anúncio "${item.title}" (R$ ${item.price.toFixed(2)}) no Vermotu.`)
    : null;

  const sectionLabel = item.type === "moto" ? "Motos" : item.type === "peca" ? "Peças" : "Serviços";
  const sectionHref = item.type === "moto" ? "/motos" : item.type === "peca" ? "/pecas" : "/servicos";

  return (
    <Layout>
      <div className="container py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-5 flex-wrap">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href={sectionHref} className="hover:text-foreground transition-colors">{sectionLabel}</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium truncate max-w-[240px]">{item.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 lg:gap-10">
          <div>
            {(() => {
              const imgs = parseImages(item.image);
              const mainSrc = imgs[activeImg] ?? imageUrl(item.image) ?? "/placeholder-moto.svg";
              return (
                <div className="space-y-2">
                  <div className="rounded-2xl overflow-hidden border border-border bg-card aspect-[4/3] relative">
                    <img
                      key={mainSrc}
                      src={mainSrc || "/placeholder-moto.svg"}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder-moto.svg"; }}
                    />
                    {item.premium && (
                      <div className="absolute top-3 left-3">
                        <Badge className="shadow-lg bg-primary text-primary-foreground text-xs px-2.5 py-1">Destaque</Badge>
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <Badge variant="secondary" className="capitalize shadow text-xs">{item.condition === "novo" ? "Novo" : "Usado"}</Badge>
                    </div>
                  </div>
                  {imgs.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {imgs.map((src, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveImg(i)}
                          className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === activeImg ? "border-primary" : "border-border hover:border-primary/50"}`}
                        >
                          <img src={src} alt={`Foto ${i + 1}`} loading="lazy" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Title block below gallery */}
            <div className="mt-5 space-y-2">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">{item.title}</h1>
              {item.brand && <p className="text-muted-foreground font-medium">{item.brand}{item.model ? ` · ${item.model}` : ""}</p>}
              {item.ratingCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  {[1,2,3,4,5].map((n) => (
                    <Star key={n} className={`w-3.5 h-3.5 ${n <= Math.round(item.ratingAvg) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  ))}
                  <span className="font-medium text-primary">{item.ratingAvg.toFixed(1)}</span>
                  <span className="text-muted-foreground">({item.ratingCount} avaliações)</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" /> {item.location}
                <span className="text-border">·</span>
                <Calendar className="w-3.5 h-3.5 shrink-0" /> {formatDateBR(item.createdAt)}
              </div>
            </div>

            <div className="mt-6 border-t border-border pt-6">
              <h2 className="text-lg font-bold mb-3">Descrição</h2>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed text-sm">{item.description}</p>
            </div>

            {/* Reviews */}
            <div className="mt-10 border-t border-border pt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Avaliações ({item.ratingCount})</h2>
                <Button variant="outline" size="sm" onClick={() => requireLogin(() => setReviewOpen(true))}>
                  <Star className="w-4 h-4 mr-1" /> Avaliar
                </Button>
              </div>
              {item.ratingCount > 0 && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-3xl font-black text-primary">{item.ratingAvg.toFixed(1)}</div>
                  <div>
                    <div className="flex">
                      {[1,2,3,4,5].map((n) => (
                        <Star key={n} className={`w-4 h-4 ${n <= Math.round(item.ratingAvg) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{item.ratingCount} avaliação(ões)</p>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {(reviews ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Seja o primeiro a avaliar este item.</p>
                )}
                {(reviews ?? []).map((r) => (
                  <div key={r.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">
                          {r.userName[0]}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{r.userName}</div>
                          <div className="text-xs text-muted-foreground">{formatRelative(r.createdAt)}</div>
                        </div>
                      </div>
                      <div className="flex">
                        {[1,2,3,4,5].map((n) => (
                          <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
            {/* Price block */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Preço</div>
              <div className="text-4xl font-black text-primary leading-none">{formatBRL(item.price)}</div>
              {item.type === "peca" && item.stock === 0 && (
                <Badge variant="destructive" className="mt-2">Esgotado</Badge>
              )}
              {item.type === "peca" && item.stock > 0 && (
                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> {item.stock} unidade{item.stock > 1 ? "s" : ""} em estoque
                </div>
              )}
            </div>

            {item.type === "moto" && (
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                {item.year != null && (
                  <div className="rounded-xl border border-border bg-card p-3">
                    <Calendar className="w-4 h-4 mx-auto text-primary mb-1.5" />
                    <div className="font-bold text-base">{item.year}</div>
                    <div className="text-xs text-muted-foreground">Ano</div>
                  </div>
                )}
                {item.mileage != null && (
                  <div className="rounded-xl border border-border bg-card p-3">
                    <Gauge className="w-4 h-4 mx-auto text-primary mb-1.5" />
                    <div className="font-bold text-base">{item.mileage.toLocaleString("pt-BR")}</div>
                    <div className="text-xs text-muted-foreground">km</div>
                  </div>
                )}
                {item.engineSize != null && (
                  <div className="rounded-xl border border-border bg-card p-3">
                    <Cog className="w-4 h-4 mx-auto text-primary mb-1.5" />
                    <div className="font-bold text-base">{item.engineSize}cc</div>
                    <div className="text-xs text-muted-foreground">Cilindrada</div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {item.type === "servico" ? (
                <Button size="lg" onClick={handleSchedule} data-testid="button-schedule">
                  <CalendarPlus className="w-4 h-4 mr-2" /> Agendar serviço
                </Button>
              ) : (
                <>
                  {item.type === "peca" && (
                    <>
                      <Button size="lg" onClick={handleBuyNow} className="shadow-md shadow-primary/20" disabled={item.stock === 0}>
                        Comprar agora
                      </Button>
                      <Button size="lg" variant="outline" onClick={handleAddToCart} disabled={item.stock === 0}>
                        <ShoppingCart className="w-4 h-4 mr-2" /> Adicionar ao carrinho
                      </Button>
                    </>
                  )}
                  <Button size="lg" variant={item.type === "peca" ? "ghost" : "default"} onClick={handleContact} data-testid="button-contact">
                    <MessageCircle className="w-4 h-4 mr-2" /> Conversar com vendedor
                  </Button>
                </>
              )}
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                  onClick={() => { track("contact", "item", item.id); track("contact", "company", item.sellerId); }}
                >
                  <div className="rounded-xl bg-emerald-600 hover:bg-emerald-700 transition-colors px-5 py-3.5 flex items-center justify-center gap-3 cursor-pointer shadow-lg shadow-emerald-900/30">
                    <SiWhatsapp className="w-5 h-5 text-white shrink-0" />
                    <div className="text-white">
                      <div className="font-bold text-sm leading-none">Conversar no WhatsApp</div>
                      <div className="text-xs text-emerald-100 mt-0.5">Mensagem automática incluída</div>
                    </div>
                  </div>
                </a>
              )}
              <div className="flex gap-2">
                <Button variant="ghost" size="lg" onClick={handleFavorite} className="flex-1" data-testid="button-favorite">
                  <Heart className={`w-4 h-4 mr-2 ${isFavorite ? "fill-primary text-primary" : ""}`} />
                  {isFavorite ? "Favoritado" : "Favoritar"}
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="flex-1"
                  onClick={() => {
                    track("share", "item", item.id);
                    navigator.share?.({ title: item.title, url: window.location.href })
                      .catch(() => { navigator.clipboard.writeText(window.location.href); });
                  }}
                >
                  Compartilhar
                </Button>
              </div>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { icon: ShieldCheck, label: "Compra protegida", color: "text-emerald-500" },
                { icon: Truck, label: "Entrega rápida", color: "text-blue-500" },
                { icon: Check, label: "Anúncio verificado", color: "text-primary" },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="rounded-xl border border-border bg-card/50 p-3 flex flex-col items-center gap-1.5">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-[10px] text-muted-foreground font-medium leading-tight text-center">{label}</span>
                </div>
              ))}
            </div>

            {/* Seller Card */}
            {seller && (
              <Link href={`/loja/${seller.id}`}>
                <div className="rounded-xl border border-border bg-card p-4 hover-elevate cursor-pointer">
                  <div className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Vendedor</div>
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                      {(seller.storeName || seller.name)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold flex items-center gap-1.5 flex-wrap">
                        {seller.storeName || seller.name}
                        {seller.accountVerified && <ShieldCheck className="w-4 h-4 text-emerald-500" aria-label="Conta verificada" />}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize mt-0.5">
                        {seller.city || "Brasil"} · Plano {seller.plan}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {seller.accountVerified && (
                          <Badge className="gap-1 h-5 px-1.5 text-[10px] bg-emerald-600 hover:bg-emerald-600 text-white">
                            <ShieldCheck className="w-2.5 h-2.5" /> Verificado
                          </Badge>
                        )}
                        {seller.phoneVerified && (
                          <Badge variant="outline" className="gap-1 h-5 px-1.5 text-[10px] border-emerald-600/30 text-emerald-500">
                            <SiWhatsapp className="w-2.5 h-2.5" /> WhatsApp ativo
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Tempo de resposta: &lt;1h
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                      Vendedor ativo
                    </div>
                  </div>
                </div>
              </Link>
            )}

            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Publicado em {formatDateBR(item.createdAt)}</div>
              <button
                type="button"
                onClick={() => requireLogin(() => setReportOpen(true))}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
              >
                <Flag className="w-3 h-3" /> Denunciar
              </button>
            </div>
          </div>
        </div>
      </div>


      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar serviço</DialogTitle>
            <DialogDescription>Escolha a data e horário para o agendamento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Data e horário</Label>
            <Input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancelar</Button>
            <Button onClick={submitSchedule} disabled={!scheduleDate || createAppt.isPending}>
              Confirmar agendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={(v) => { setReportOpen(v); if (!v) { setReportReason(""); setReportDetails(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Denunciar este anúncio</DialogTitle>
            <DialogDescription>Selecione o motivo da denúncia. Nossa equipe analisará em até 48h.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Motivo</Label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione um motivo...</option>
                {["Conteúdo impróprio ou ofensivo", "Anúncio fraudulento ou enganoso", "Produto proibido ou ilegal", "Spam ou anúncio duplicado", "Informações incorretas", "Outro"].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Detalhes adicionais (opcional)</Label>
              <Textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Descreva o problema com mais detalhes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={!reportReason || createReport.isPending}
              onClick={() => {
                if (!currentUserId || !reportReason) return;
                createReport.mutate(
                  { data: { reporterId: currentUserId, targetType: "item", targetId: item.id, reason: reportReason, details: reportDetails } },
                  {
                    onSuccess: () => {
                      setReportOpen(false);
                      setReportReason(""); setReportDetails("");
                      toast.success("Denúncia enviada. Nossa equipe analisará em breve.");
                    },
                    onError: () => toast.error("Não foi possível enviar a denúncia."),
                  },
                );
              }}
            >
              {createReport.isPending ? "Enviando..." : "Enviar denúncia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avaliar este item</DialogTitle>
            <DialogDescription>Compartilhe sua experiência com este produto ou serviço.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Sua nota</Label>
              <div className="flex gap-1">
                {[1,2,3,4,5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)}>
                    <Star className={`w-8 h-8 ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="rev-comment">Comentário (opcional)</Label>
              <Textarea id="rev-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Conte sua experiência..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitReview} disabled={createRev.isPending}>Enviar avaliação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
