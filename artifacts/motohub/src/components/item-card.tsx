import { Link } from "wouter";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Gauge, Star } from "lucide-react";
import type { Item } from "@workspace/api-client-react";
import { formatBRL, imageUrl } from "@/lib/session";

const sectionPath = (t: Item["type"]) =>
  t === "moto" ? "motos" : t === "peca" ? "pecas" : "servicos";

export function ItemCard({ item }: { item: Item }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-colors"
      data-testid={`card-item-${item.id}`}
    >
      <div className="aspect-[4/3] overflow-hidden bg-muted relative">
        <img
          src={imageUrl(item.image) || "/placeholder-moto.svg"}
          alt={item.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder-moto.svg"; }}
        />
        {item.premium && (
          <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground shadow-md">
            Premium
          </Badge>
        )}
        {item.type === "peca" && item.stock === 0 && (
          <Badge variant="outline" className="absolute top-3 right-3 bg-background/90">
            Esgotado
          </Badge>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          {item.brand && <span className="font-medium uppercase tracking-wide">{item.brand}</span>}
          {item.year && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{item.year}</span>
            </>
          )}
        </div>
        <h3 className="font-semibold text-base mb-2 line-clamp-1">{item.title}</h3>
        <div className="text-primary font-black text-xl mb-2">{formatBRL(item.price)}</div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{item.location}</span>
          {item.ratingCount > 0 ? (
            <span className="flex items-center gap-1 shrink-0">
              <Star className="w-3 h-3 fill-primary text-primary" />
              {item.ratingAvg.toFixed(1)} ({item.ratingCount})
            </span>
          ) : item.mileage != null ? (
            <span className="flex items-center gap-1 shrink-0"><Gauge className="w-3 h-3" />{item.mileage.toLocaleString("pt-BR")} km</span>
          ) : null}
        </div>
      </div>
      <Link href={`/${sectionPath(item.type)}/${item.id}`} className="absolute inset-0 z-10">
        <span className="sr-only">Ver detalhes</span>
      </Link>
    </motion.div>
  );
}
