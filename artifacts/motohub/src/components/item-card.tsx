import { Link } from "wouter";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { MapPin, Gauge, Star } from "lucide-react";
import type { Item } from "@workspace/api-client-react";
import { formatBRL, imageUrl } from "@/lib/session";

const sectionPath = (t: Item["type"]) =>
  t === "moto" ? "motos" : t === "peca" ? "pecas" : "servicos";

export function ItemCard({ item }: { item: Item }) {
  const isNew = item.condition === "novo";
  const isSold = item.status === "sold";

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="group relative rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-xl hover:shadow-black/20 transition-all duration-200"
      data-testid={`card-item-${item.id}`}
    >
      {/* Image */}
      <div className="aspect-[4/3] overflow-hidden bg-muted relative">
        <img
          src={imageUrl(item.image) || "/placeholder-moto.svg"}
          alt={item.title}
          loading="lazy"
          decoding="async"
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${isSold ? "opacity-50 grayscale" : ""}`}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder-moto.svg"; }}
        />
        {/* Overlayed badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {item.premium && (
            <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 shadow-md h-auto">
              Destaque
            </Badge>
          )}
          {isNew && !isSold && (
            <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 h-auto">
              Novo
            </Badge>
          )}
        </div>
        {isSold && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="bg-black/70 text-white text-xs font-semibold px-3 py-1 rounded-full tracking-wide">
              Vendido
            </span>
          </div>
        )}
        {item.type === "peca" && item.stock === 0 && !isSold && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="outline" className="bg-background/90 text-[10px] h-auto px-2 py-0.5">
              Esgotado
            </Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5">
        {/* Brand + year row */}
        {(item.brand || item.year) && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1 font-medium">
            {item.brand && <span className="uppercase tracking-wider">{item.brand}</span>}
            {item.brand && item.year && <span className="text-border">·</span>}
            {item.year && <span>{item.year}</span>}
            {!isNew && item.type === "moto" && (
              <>
                <span className="text-border">·</span>
                <span>Usado</span>
              </>
            )}
          </div>
        )}

        <h3 className="font-semibold text-sm leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {item.title}
        </h3>

        <div className="text-primary font-bold text-lg tracking-tight mb-2.5">
          {formatBRL(item.price)}
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 truncate min-w-0">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{item.location}</span>
          </span>
          {item.ratingCount > 0 ? (
            <span className="flex items-center gap-1 shrink-0">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="font-medium">{item.ratingAvg.toFixed(1)}</span>
              <span className="text-muted-foreground/60">({item.ratingCount})</span>
            </span>
          ) : item.mileage != null ? (
            <span className="flex items-center gap-1 shrink-0">
              <Gauge className="w-3 h-3" />
              {item.mileage.toLocaleString("pt-BR")} km
            </span>
          ) : null}
        </div>
      </div>

      <Link href={`/${sectionPath(item.type)}/${item.id}`} className="absolute inset-0 z-10">
        <span className="sr-only">Ver {item.title}</span>
      </Link>
    </motion.div>
  );
}
