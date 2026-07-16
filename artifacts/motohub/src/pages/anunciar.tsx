import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCreateItem, getListItemsQueryKey, useGetUser, useSetUserCpf, getGetUserQueryKey } from "@workspace/api-client-react";
import { useSession, imageUrl } from "@/lib/session";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUpload } from "@workspace/object-storage-web";
import { Upload, ImageIcon, X, Loader2, ShieldCheck, Lock, Bike, RefreshCw, Wrench, Zap, Building2, ChevronLeft, AlertCircle, Check, Star } from "lucide-react";
import { ESTADOS, CIDADES_POR_ESTADO, formatLocalidade } from "@/lib/localidades";

function formatCpfInput(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function extractError(err: unknown, fallback: string): string {
  const obj = err as { data?: { error?: string } };
  return obj?.data?.error || fallback;
}

type FormType = "moto" | "troca" | "peca" | "servico" | "oficina";

const FORM_TYPES: { id: FormType; label: string; sublabel: string; icon: React.ElementType }[] = [
  { id: "moto", label: "Venda de Moto", sublabel: "Anuncie sua moto para venda", icon: Bike },
  { id: "troca", label: "Troca de Moto", sublabel: "Ofereça sua moto para troca", icon: RefreshCw },
  { id: "peca", label: "Peça / Acessório", sublabel: "Venda peças e acessórios", icon: Wrench },
  { id: "servico", label: "Serviço", sublabel: "Ofereça um serviço mecânico", icon: Zap },
  { id: "oficina", label: "Cadastrar Oficina", sublabel: "Divulgue sua oficina", icon: Building2 },
];

const MOTO_BRANDS = ["Honda", "Yamaha", "Kawasaki", "Suzuki", "BMW", "Ducati", "KTM", "Royal Enfield", "Harley-Davidson", "Triumph", "Bajaj", "Shineray", "Dafra", "Outro"];
const MOTO_OPTIONALS = ["ABS", "Freio a disco dianteiro", "Freio a disco traseiro", "Computador de bordo", "Alarme", "Bagageiro", "Protetor de mãos", "Guidão especial", "Escape esportivo", "Pneus novos"];
const PECA_TYPES = ["Motor", "Freio", "Suspensão", "Elétrica", "Carroceria / Funilaria", "Transmissão", "Embreagem", "Lubrificante / Filtro", "Pneu / Câmara", "Acessório", "Outro"];
const SERVICO_TYPES = ["Revisão geral", "Troca de óleo", "Freio", "Suspensão", "Motor", "Elétrica / Injeção", "Funilaria / Pintura", "Estética", "Personalização", "Outro"];
const OFICINA_SERVICES = ["Revisão geral", "Troca de óleo", "Freio", "Suspensão", "Motor", "Elétrica", "Funilaria", "Estética", "Personalização", "Troca de pneus"];
const FUEL_TYPES = ["Gasolina", "Flex (gasolina/álcool)", "Álcool", "Elétrica", "Híbrida"];
const CRASH_HISTORY = [
  { value: "nunca_caiu", label: "Nunca caiu" },
  { value: "pequena_queda", label: "Pequena queda / arranhado" },
  { value: "acidente", label: "Acidente (com danos) " },
];
const DOCS_STATUS = [
  { value: "quitada", label: "Quitada" },
  { value: "financiada", label: "Financiada" },
  { value: "alienada", label: "Alienada (com gravame)" },
];
const MECHANICS_STATUS = [
  { value: "original", label: "Motor original" },
  { value: "retificado", label: "Motor retificado" },
  { value: "revisada", label: "Revisada recentemente" },
];
const TIRES_STATUS = [
  { value: "novos", label: "Pneus novos" },
  { value: "bons", label: "Pneus bons" },
  { value: "trocar", label: "Precisam de troca" },
];
const CONDITIONS = [
  { value: "novo", label: "Novo" },
  { value: "excelente", label: "Excelente estado" },
  { value: "bom", label: "Bom estado" },
  { value: "regular", label: "Estado regular" },
  { value: "usado", label: "Usado" },
];

export function Anunciar() {
  const currentUserId = useSession((s) => s.currentUserId);
  const setLoginOpen = useSession((s) => s.setLoginOpen);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user } = useGetUser(currentUserId ?? 0, {
    query: { enabled: !!currentUserId, queryKey: getGetUserQueryKey(currentUserId ?? 0) },
  });

  const createItem = useCreateItem();
  const setCpf = useSetUserCpf();

  const [formType, setFormType] = useState<FormType | null>(null);

  // Common fields
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const location = cidade && estado ? formatLocalidade(cidade, estado) : "";
  const image = images[0] ?? "";

  // Moto + Troca fields
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [mileage, setMileage] = useState("");
  const [engineSize, setEngineSize] = useState("");
  const [color, setColor] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [condition, setCondition] = useState("usado");
  const [selectedOptionals, setSelectedOptionals] = useState<string[]>([]);
  // Phase 4: extra moto condition fields
  const [crashHistory, setCrashHistory] = useState("nunca_caiu");
  const [docsStatus, setDocsStatus] = useState("quitada");
  const [mechanicsStatus, setMechanicsStatus] = useState("original");
  const [tiresStatus, setTiresStatus] = useState("bons");
  const [hasManual, setHasManual] = useState(false);
  const [hasSpareKey, setHasSpareKey] = useState(false);

  // Troca specific
  const [desiredMoto, setDesiredMoto] = useState("");
  const [acceptCashback, setAcceptCashback] = useState(false);
  const [cashback, setCashback] = useState("");

  // Peça specific
  const [partType, setPartType] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [compatibility, setCompatibility] = useState("");

  // Serviço + Oficina specific
  const [serviceType, setServiceType] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [workingHours, setWorkingHours] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");

  // CPF
  const [cpfInput, setCpfInput] = useState("");

  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (res) => {
      setImages((prev) => {
        const next = [...prev];
        if (uploadingIdx !== null && uploadingIdx < next.length) {
          next[uploadingIdx] = res.objectPath;
        } else {
          next.push(res.objectPath);
        }
        setUploadingIdx(null);
        return next;
      });
      toast.success("Foto enviada!");
    },
    onError: () => { setUploadingIdx(null); toast.error("Falha no upload da foto"); },
  });

  useEffect(() => { document.title = "Anunciar — Vermotu"; }, []);
  useEffect(() => { if (!currentUserId) setLoginOpen(true); }, [currentUserId, setLoginOpen]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>, replaceIdx?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Google Fotos no Android entrega file.type === "" — o atributo accept="image/*" já filtra no nível do SO.
    if (file.type && !file.type.startsWith("image/")) { toast.error("Envie um arquivo de imagem"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 10 MB"); return; }
    setUploadingIdx(replaceIdx ?? null);
    uploadFile(file);
    e.target.value = "";
  };

  const toggleOptional = (opt: string) =>
    setSelectedOptionals((prev) => prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]);

  const toggleService = (svc: string) =>
    setSelectedServices((prev) => prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]);

  const handleSaveCpf = async () => {
    if (!currentUserId) return;
    const digits = cpfInput.replace(/\D/g, "");
    if (digits.length !== 11) {
      toast.error("Digite o CPF completo (11 dígitos).");
      return;
    }
    try {
      const updated = await setCpf.mutateAsync({ id: currentUserId, data: { cpf: digits } });
      queryClient.setQueryData(getGetUserQueryKey(currentUserId), updated);
      queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(currentUserId) });
      toast.success("CPF validado! Agora escolha o tipo de anúncio.");
    } catch (err) {
      const apiErr = err as { data?: { error?: string }; message?: string };
      const msg = apiErr?.data?.error ?? apiErr?.message ?? "CPF inválido. Verifique os números digitados.";
      toast.error(msg);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !user || !formType) { setLoginOpen(true); return; }
    if (!user.cpf) { toast.error("Cadastre seu CPF antes de anunciar."); return; }
    if (!title.trim() || title.trim().length < 3) { toast.error("Informe um título com ao menos 3 caracteres."); return; }
    if (!Number(price) || Number(price) < 0) { toast.error("Informe um preço válido (0 para consultar)."); return; }
    if (description.trim().length < 100) { toast.error("Descreva seu anúncio com mais detalhes (mín. 100 caracteres)."); return; }
    if (description.trim().length > 5000) { toast.error("Descrição muito longa (máx. 5.000 caracteres)."); return; }
    if (!cidade || !estado) { toast.error("Selecione o estado e a cidade do anúncio."); return; }
    if (images.length === 0) { toast.error("Envie pelo menos uma foto do anúncio."); return; }
    if (formType === "oficina" && !phone.trim()) { toast.error("Informe o WhatsApp da oficina."); return; }

    let itemType: "moto" | "peca" | "servico" = "moto";
    let category = "geral";
    let extras: string | undefined;
    let tradeInfo: string | undefined;

    if (formType === "moto") {
      itemType = "moto"; category = "geral";
      extras = JSON.stringify({ crashHistory, docsStatus, mechanicsStatus, tiresStatus, hasManual, hasSpareKey });
    }
    else if (formType === "troca") {
      itemType = "moto"; category = "troca";
      tradeInfo = JSON.stringify({ desiredMoto, cashback: acceptCashback ? Number(cashback) : 0, acceptCashback });
    }
    else if (formType === "peca") { itemType = "peca"; category = partType || "geral"; }
    else if (formType === "servico") { itemType = "servico"; category = serviceType || "geral"; }
    else if (formType === "oficina") {
      itemType = "servico"; category = "oficina";
      extras = JSON.stringify({ services: selectedServices, specialties, instagram, facebook });
    }

    createItem.mutate(
      {
        data: {
          type: itemType,
          category,
          title: title.trim(),
          brand: (formType === "moto" || formType === "troca") ? brand : (formType === "peca" ? manufacturer : undefined),
          model: (formType === "moto" || formType === "troca") ? model : (formType === "peca" ? compatibility : undefined),
          condition: condition as "novo" | "usado",
          price: Number(price),
          year: (formType === "moto" || formType === "troca") && year ? Number(year) : null,
          mileage: (formType === "moto" || formType === "troca") && mileage ? Number(mileage) : null,
          engineSize: (formType === "moto" || formType === "troca") && engineSize ? Number(engineSize) : null,
          color: color || undefined,
          fuelType: fuelType || undefined,
          optionals: selectedOptionals.length ? JSON.stringify(selectedOptionals) : undefined,
          tradeInfo,
          phone: phone || undefined,
          address: address || undefined,
          workingHours: workingHours || undefined,
          extras,
          image: images.length === 1 ? images[0]! : JSON.stringify(images),
          description: description.trim(),
          location: location.trim(),
          sellerId: currentUserId,
          premium: false,
        } as Parameters<typeof createItem.mutate>[0]["data"],
      },
      {
        onSuccess: (created) => {
          queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListItemsQueryKey({ sellerId: currentUserId }) });
          toast.success("Anúncio publicado com sucesso!");
          const section = itemType === "moto" ? "motos" : itemType === "peca" ? "pecas" : "servicos";
          setLocation(`/${section}/${created.id}`);
        },
        onError: (err) => toast.error(extractError(err, "Não foi possível publicar o anúncio.")),
      },
    );
  };

  if (!currentUserId) {
    return (
      <Layout>
        <section className="container py-20 text-center">
          <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Entre para anunciar</h1>
          <p className="text-muted-foreground mb-6">Crie sua conta gratuita para publicar motos, peças e serviços.</p>
          <Button onClick={() => setLoginOpen(true)}>Entrar / Cadastrar</Button>
        </section>
      </Layout>
    );
  }

  if (user && !user.cpf) {
    return (
      <Layout>
        <section className="container py-10 max-w-xl">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-primary mb-1">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-sm font-semibold uppercase tracking-wide">Verificação obrigatória</span>
              </div>
              <CardTitle>Confirme seu CPF para anunciar</CardTitle>
              <CardDescription>Seus dados ficam seguros e não aparecem no anúncio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" inputMode="numeric" value={cpfInput} onChange={(e) => setCpfInput(formatCpfInput(e.target.value))} placeholder="000.000.000-00" />
              </div>
              <Button onClick={handleSaveCpf} disabled={setCpf.isPending} className="w-full" size="lg">
                {setCpf.isPending ? "Validando..." : "Validar CPF e continuar"}
              </Button>
            </CardContent>
          </Card>
        </section>
      </Layout>
    );
  }

  if (!formType) {
    return (
      <Layout>
        <section className="container py-10 max-w-3xl">
          <h1 className="text-3xl font-bold mb-2">O que você quer anunciar?</h1>
          <p className="text-muted-foreground mb-8">Selecione a categoria do seu anúncio.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FORM_TYPES.map(({ id, label, sublabel, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setFormType(id)}
                className="rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all p-5 text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="font-semibold">{label}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{sublabel}</div>
              </button>
            ))}
          </div>
        </section>
      </Layout>
    );
  }

  const currentFormType = FORM_TYPES.find((t) => t.id === formType)!;

  return (
    <Layout>
      <section className="container py-10 max-w-3xl">
        <button
          onClick={() => setFormType(null)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar à seleção
        </button>
        <h1 className="text-3xl font-bold mb-2">{currentFormType.label}</h1>
        <p className="text-muted-foreground mb-8">{currentFormType.sublabel}</p>

        <Card>
          <CardHeader><CardTitle>Detalhes do anúncio</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">

              {/* ─── MOTO fields ─── */}
              {formType === "moto" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Marca *</Label>
                      <Select value={brand} onValueChange={setBrand}>
                        <SelectTrigger><SelectValue placeholder="Selecione a marca" /></SelectTrigger>
                        <SelectContent>{MOTO_BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Modelo *</Label>
                      <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ex: CG 160 Titan, MT-03..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Ano</Label>
                      <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2023" min="1950" max="2026" />
                    </div>
                    <div className="space-y-2">
                      <Label>Km rodados</Label>
                      <Input type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="15000" />
                    </div>
                    <div className="space-y-2">
                      <Label>Cilindrada (cc)</Label>
                      <Input type="number" value={engineSize} onChange={(e) => setEngineSize(e.target.value)} placeholder="160" />
                    </div>
                    <div className="space-y-2">
                      <Label>Cor</Label>
                      <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Vermelho" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Combustível</Label>
                      <Select value={fuelType} onValueChange={setFuelType}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{FUEL_TYPES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Estado de conservação</Label>
                      <Select value={condition} onValueChange={setCondition}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CONDITIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Opcionais</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {MOTO_OPTIONALS.map((opt) => (
                        <label key={opt} className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors text-sm ${selectedOptionals.includes(opt) ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50"}`}>
                          <input type="checkbox" className="sr-only" checked={selectedOptionals.includes(opt)} onChange={() => toggleOptional(opt)} />
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${selectedOptionals.includes(opt) ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                            {selectedOptionals.includes(opt) && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Phase 4: detailed moto condition */}
                  <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informações detalhadas</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Histórico de quedas</Label>
                        <Select value={crashHistory} onValueChange={setCrashHistory}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{CRASH_HISTORY.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Documentação</Label>
                        <Select value={docsStatus} onValueChange={setDocsStatus}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{DOCS_STATUS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Estado do motor</Label>
                        <Select value={mechanicsStatus} onValueChange={setMechanicsStatus}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{MECHANICS_STATUS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Pneus</Label>
                        <Select value={tiresStatus} onValueChange={setTiresStatus}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{TIRES_STATUS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Itens inclusos</Label>
                      <div className="flex flex-wrap gap-3">
                        {[
                          { label: "Manual do proprietário", checked: hasManual, set: setHasManual },
                          { label: "Chave reserva", checked: hasSpareKey, set: setHasSpareKey },
                        ].map(({ label, checked, set }) => (
                          <label key={label} className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition-colors ${checked ? "border-primary bg-primary/5 text-primary" : "border-border"}`}>
                            <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => set(e.target.checked)} />
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                              {checked && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ─── TROCA fields ─── */}
              {formType === "troca" && (
                <>
                  <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-4">
                    <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados da sua moto</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Marca *</Label>
                        <Select value={brand} onValueChange={setBrand}>
                          <SelectTrigger><SelectValue placeholder="Selecione a marca" /></SelectTrigger>
                          <SelectContent>{MOTO_BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Modelo *</Label>
                        <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ex: CG 160 Titan..." />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Ano</Label>
                        <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2020" />
                      </div>
                      <div className="space-y-2">
                        <Label>Km</Label>
                        <Input type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="20000" />
                      </div>
                      <div className="space-y-2">
                        <Label>Cilindrada</Label>
                        <Input type="number" value={engineSize} onChange={(e) => setEngineSize(e.target.value)} placeholder="160" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Moto desejada na troca *</Label>
                    <Textarea value={desiredMoto} onChange={(e) => setDesiredMoto(e.target.value)} rows={3} placeholder="Descreva qual moto você deseja em troca. Ex: Honda CB 300 2019 ou superior..." />
                  </div>
                  <div className="space-y-3">
                    <Label>Aceita retorno financeiro?</Label>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setAcceptCashback(false)} className={`flex-1 rounded-lg border py-2 text-sm transition-colors ${!acceptCashback ? "border-primary bg-primary/5 text-primary font-medium" : "border-border"}`}>Não</button>
                      <button type="button" onClick={() => setAcceptCashback(true)} className={`flex-1 rounded-lg border py-2 text-sm transition-colors ${acceptCashback ? "border-primary bg-primary/5 text-primary font-medium" : "border-border"}`}>Sim</button>
                    </div>
                    {acceptCashback && (
                      <div className="space-y-2">
                        <Label>Valor de retorno (R$)</Label>
                        <Input type="number" value={cashback} onChange={(e) => setCashback(e.target.value)} placeholder="Ex: 2000" />
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ─── PEÇA fields ─── */}
              {formType === "peca" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de peça</Label>
                      <Select value={partType} onValueChange={setPartType}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{PECA_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Fabricante / Marca</Label>
                      <Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="Ex: Cofap, Mahle, TDC..." />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Compatível com</Label>
                    <Input value={compatibility} onChange={(e) => setCompatibility(e.target.value)} placeholder="Ex: Honda CG 160 2015-2023, Titan 150..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado de conservação</Label>
                    <Select value={condition} onValueChange={setCondition}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="novo">Novo (sem uso)</SelectItem>
                        <SelectItem value="usado">Usado — bom estado</SelectItem>
                        <SelectItem value="regular">Usado — com desgaste</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* ─── SERVIÇO fields ─── */}
              {formType === "servico" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de serviço</Label>
                      <Select value={serviceType} onValueChange={setServiceType}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{SERVICO_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp (contato)</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(21) 99999-0000" inputMode="tel" />
                    </div>
                  </div>
                </>
              )}

              {/* ─── OFICINA fields ─── */}
              {formType === "oficina" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>WhatsApp *</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(21) 99999-0000" inputMode="tel" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Horário de funcionamento</Label>
                      <Input value={workingHours} onChange={(e) => setWorkingHours(e.target.value)} placeholder="Seg-Sex: 8h-18h, Sab: 8h-13h" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Endereço completo</Label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro, cidade..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Serviços oferecidos</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {OFICINA_SERVICES.map((svc) => (
                        <label key={svc} className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors text-sm ${selectedServices.includes(svc) ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50"}`}>
                          <input type="checkbox" className="sr-only" checked={selectedServices.includes(svc)} onChange={() => toggleService(svc)} />
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${selectedServices.includes(svc) ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                            {selectedServices.includes(svc) && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          {svc}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Especialidades / Marcas atendidas</Label>
                    <Input value={specialties} onChange={(e) => setSpecialties(e.target.value)} placeholder="Honda, Yamaha, Kawasaki..." />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Instagram (opcional)</Label>
                      <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@suaofficina" />
                    </div>
                    <div className="space-y-2">
                      <Label>Facebook (opcional)</Label>
                      <Input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="facebook.com/suaofficina" />
                    </div>
                  </div>
                </>
              )}

              {/* ─── TITLE (auto or manual) ─── */}
              <div className="space-y-2">
                <Label>Título do anúncio *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    formType === "moto" ? "Ex: Honda CG 160 Titan 2023 — Impecável" :
                    formType === "troca" ? "Ex: Troca Honda CG 160 por maior" :
                    formType === "peca" ? "Ex: Kit de freio traseiro Honda Titan" :
                    formType === "servico" ? "Ex: Troca de óleo com revisão completa" :
                    "Ex: Oficina MotoTech — Especializada em Honda"
                  }
                  required
                  minLength={3}
                />
              </div>

              {/* ─── PRICE + LOCATION ─── */}
              <div className="space-y-2">
                <Label>
                  {formType === "oficina" ? "Preço médio (0 = a consultar)" :
                   formType === "troca" ? "Valor de referência da moto (R$)" :
                   "Preço (R$) *"}
                </Label>
                <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={formType === "oficina" ? "0" : "15500"} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estado *</Label>
                  <Select value={estado} onValueChange={(v) => { setEstado(v); setCidade(""); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione o estado" /></SelectTrigger>
                    <SelectContent>
                      {ESTADOS.map((e) => (
                        <SelectItem key={e.uf} value={e.uf}>{e.nome} ({e.uf})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cidade *</Label>
                  <Select value={cidade} onValueChange={setCidade} disabled={!estado}>
                    <SelectTrigger><SelectValue placeholder={estado ? "Selecione a cidade" : "Escolha o estado primeiro"} /></SelectTrigger>
                    <SelectContent>
                      {(CIDADES_POR_ESTADO[estado] ?? []).map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ─── DESCRIPTION ─── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Descrição *</Label>
                  <span className={`text-xs font-medium ${description.length < 100 ? "text-orange-500" : description.length > 5000 ? "text-destructive" : "text-muted-foreground"}`}>
                    {description.length}/5000
                    {description.length < 100 && ` (mín. 100)`}
                  </span>
                </div>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  placeholder={
                    formType === "moto" ? "Descreva o estado da moto, histórico de revisões, motivo da venda, melhorias realizadas, acessórios inclusos..." :
                    formType === "troca" ? "Informe detalhes sobre a sua moto e o que você busca na troca. Quanto mais detalhes, maior a chance de encontrar o parceiro ideal..." :
                    formType === "peca" ? "Descreva a condição da peça, origem, garantia, compatibilidade verificada..." :
                    formType === "servico" ? "Descreva o serviço, diferencial, tempo de entrega, garantia oferecida..." :
                    "Descreva a oficina, anos de experiência, estrutura, equipe e especialidades..."
                  }
                  required
                  maxLength={5000}
                />
                {description.length < 100 && description.length > 0 && (
                  <p className="text-xs text-orange-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Faltam {100 - description.length} caracteres para o mínimo obrigatório
                  </p>
                )}
              </div>

              {/* ─── PHOTOS (até 5) ─── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Fotos do anúncio * <span className="text-muted-foreground font-normal">(até 5 — a 1ª é a principal)</span></Label>
                  <span className="text-xs text-muted-foreground">{images.length}/5</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {Array.from({ length: 5 }).map((_, idx) => {
                    const src = images[idx] ? imageUrl(images[idx]!) : null;
                    const uploading = isUploading && uploadingIdx === idx;
                    const uploadingNew = isUploading && uploadingIdx === null && idx === images.length;
                    const active = uploading || uploadingNew;
                    return (
                      <div key={idx} className="relative aspect-square">
                        {src ? (
                          <div className="relative w-full h-full rounded-lg overflow-hidden border-2 border-primary bg-muted group">
                            <img src={src} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                            {idx === 0 && (
                              <span className="absolute bottom-0 left-0 right-0 bg-primary/90 text-white text-[9px] font-bold text-center py-0.5">PRINCIPAL</span>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                              {idx > 0 && (
                                <button type="button" title="Tornar principal" onClick={() => setImages((p) => { const n = [...p]; const t = n[0]!; n[0] = n[idx]!; n[idx] = t; return n; })}
                                  className="w-6 h-6 rounded bg-white/90 text-black flex items-center justify-center hover:bg-white"><Star className="w-3 h-3 fill-current" /></button>
                              )}
                              <button type="button" title="Remover" onClick={() => setImages((p) => p.filter((_, i) => i !== idx))}
                                className="w-6 h-6 rounded bg-red-500 text-white flex items-center justify-center hover:bg-red-600">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className={`w-full h-full aspect-square flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors text-xs gap-1 cursor-pointer
                            ${active ? "border-primary bg-primary/5 opacity-70 pointer-events-none" : idx <= images.length ? "border-border hover:border-primary hover:bg-primary/5" : "border-border/30 opacity-30 pointer-events-none"}`}>
                            {active ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                {progress > 0 && <span className="text-primary">{progress}%</span>}
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">{idx === 0 ? "Principal" : `Foto ${idx + 1}`}</span>
                              </>
                            )}
                            <input type="file" accept="image/*" className="hidden"
                              disabled={isUploading || idx > images.length}
                              onChange={(e) => onPickFile(e, idx < images.length ? idx : undefined)} />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">JPG, PNG ou WebP — máx 10 MB por foto. Clique <Star className="w-3 h-3 inline fill-current" /> para definir a foto principal.</p>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={createItem.isPending || isUploading}>
                {createItem.isPending ? "Publicando..." : "Publicar anúncio"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </Layout>
  );
}
