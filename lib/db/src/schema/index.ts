import { pgTable, serial, integer, text, doublePrecision, boolean, timestamp, primaryKey, unique } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull().default(""),
  phone: text("phone").unique(),
  cpf: text("cpf").unique(),
  cnpj: text("cnpj").unique(),
  accountType: text("account_type").notNull().default("pessoa"),
  avatarUrl: text("avatar_url"),
  acceptedTerms: boolean("accepted_terms").notNull().default(false),
  acceptedTermsAt: timestamp("accepted_terms_at", { withTimezone: true }),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  accountVerified: boolean("account_verified").notNull().default(false),
  plan: text("plan").notNull().default("free"),
  isAdmin: boolean("is_admin").notNull().default(false),
  role: text("role").notNull().default("user"),
  banned: boolean("banned").notNull().default(false),
  storeName: text("store_name").notNull().default(""),
  bio: text("bio").notNull().default(""),
  city: text("city").notNull().default(""),
  state: text("state").notNull().default(""),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  businessHoursOpen: text("business_hours_open"),
  businessHoursClose: text("business_hours_close"),
  loginAttempts: integer("login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  stripeCustomerId: text("stripe_customer_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const itemsTable = pgTable("items", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  category: text("category").notNull().default("geral"),
  title: text("title").notNull(),
  brand: text("brand"),
  model: text("model"),
  condition: text("condition").notNull().default("usado"),
  price: doublePrecision("price").notNull(),
  year: integer("year"),
  mileage: integer("mileage"),
  engineSize: integer("engine_size"),
  color: text("color"),
  fuelType: text("fuel_type"),
  optionals: text("optionals"),
  tradeInfo: text("trade_info"),
  phone: text("phone"),
  address: text("address"),
  workingHours: text("working_hours"),
  extras: text("extras"),
  image: text("image").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  state: text("state").notNull().default(""),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  sellerId: integer("seller_id").notNull(),
  status: text("status").notNull().default("active"),
  premium: boolean("premium").notNull().default(false),
  stock: integer("stock").notNull().default(1),
  ratingAvg: doublePrecision("rating_avg").notNull().default(0),
  ratingCount: integer("rating_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const favoritesTable = pgTable("favorites", {
  userId: integer("user_id").notNull(),
  itemId: integer("item_id").notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.userId, t.itemId] }) }));

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").notNull(),
  sellerId: integer("seller_id").notNull(),
  itemId: integer("item_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  senderId: integer("sender_id").notNull(),
  text: text("text").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const appointmentsTable = pgTable("appointments", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull(),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(),
  status: text("status").notNull().default("scheduled"),
});

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").notNull(),
  sellerId: integer("seller_id").notNull(),
  status: text("status").notNull().default("pending"),
  subtotal: doublePrecision("subtotal").notNull(),
  discount: doublePrecision("discount").notNull().default(0),
  total: doublePrecision("total").notNull(),
  couponCode: text("coupon_code"),
  paymentMethod: text("payment_method").notNull(),
  shippingAddress: text("shipping_address").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  itemId: integer("item_id").notNull(),
  title: text("title").notNull(),
  image: text("image").notNull(),
  price: doublePrecision("price").notNull(),
  qty: integer("qty").notNull(),
});

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull(),
  userId: integer("user_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const couponsTable = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  type: text("type").notNull().default("percent"),
  value: doublePrecision("value").notNull(),
  minOrder: doublePrecision("min_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminLogsTable = pgTable("admin_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull(),
  adminName: text("admin_name").notNull().default(""),
  action: text("action").notNull(),
  target: text("target").notNull().default(""),
  details: text("details").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").notNull(),
  targetType: text("target_type").notNull().default("item"),
  targetId: integer("target_id").notNull(),
  reason: text("reason").notNull(),
  details: text("details").notNull().default(""),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const blogPostsTable = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull().default(""),
  excerpt: text("excerpt").notNull().default(""),
  category: text("category").notNull().default("geral"),
  authorId: integer("author_id").notNull(),
  authorName: text("author_name").notNull().default(""),
  published: boolean("published").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  seoTitle: text("seo_title").notNull().default(""),
  seoDescription: text("seo_description").notNull().default(""),
  coverImageUrl: text("cover_image_url"),
  views: integer("views").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bannersTable = pgTable("banners", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  ctaText: text("cta_text").notNull().default(""),
  ctaUrl: text("cta_url").notNull().default("/"),
  imageUrl: text("image_url").notNull().default(""),
  bgColor: text("bg_color").notNull().default("#000000"),
  order: integer("order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  durationSecs: integer("duration_secs").notNull().default(6),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emailCampaignsTable = pgTable("email_campaigns", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  targetFilter: text("target_filter").notNull().default("all"),
  recipientCount: integer("recipient_count").notNull().default(0),
  sentBy: integer("sent_by").notNull(),
  sentByName: text("sent_by_name").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const serviceRequestsTable = pgTable("service_requests", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").notNull().unique(),
  customerId: integer("customer_id").notNull(),
  rawQuery: text("raw_query").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  brand: text("brand"),
  model: text("model"),
  partType: text("part_type"),
  serviceType: text("service_type"),
  urgency: text("urgency").notNull().default("normal"),
  city: text("city").notNull().default(""),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  status: text("status").notNull().default("aberta"),
  acceptedProposalId: integer("accepted_proposal_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const serviceProposalsTable = pgTable("service_proposals", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  companyId: integer("company_id").notNull(),
  price: doublePrecision("price"),
  timeframe: text("timeframe"),
  availability: text("availability"),
  message: text("message").notNull().default(""),
  status: text("status").notNull().default("pendente"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Learning signal log for the Vermotu smart-ranking algorithm.
 * Every click, view, favorite, search, contact, request, purchase and review
 * is recorded here so the ranking engine can keep improving recommendations
 * over time without needing a separate ML pipeline up front.
 */
export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  sessionId: text("session_id"),
  eventType: text("event_type").notNull(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id"),
  query: text("query"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Precomputed composite ranking score per item/company, so that search and
 * matching endpoints don't have to recompute the full quality score on every
 * request. Recomputed incrementally whenever a relevant signal changes
 * (review, order, proposal response, etc.) and periodically in bulk.
 */
export const rankingScoresTable = pgTable("ranking_scores", {
  id: serial("id").primaryKey(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  score: doublePrecision("score").notNull().default(0),
  breakdown: text("breakdown").notNull().default("{}"),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uniq: unique().on(t.targetType, t.targetId) }));

/**
 * Raw search history (natural-language queries + parsed intent), used both
 * as an audit trail and as training/personalization signal for recommendations.
 */
export const searchHistoryTable = pgTable("search_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  sessionId: text("session_id"),
  rawQuery: text("raw_query").notNull(),
  category: text("category"),
  brand: text("brand"),
  model: text("model"),
  year: integer("year"),
  city: text("city"),
  state: text("state"),
  urgency: text("urgency"),
  resultsCount: integer("results_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  plan: text("plan").notNull(),
  amount: doublePrecision("amount").notNull(),
  status: text("status").notNull().default("awaiting_payment"),
  provider: text("provider").notNull().default("pix"),
  pixCode: text("pix_code").notNull().default(""),
  pixKey: text("pix_key").notNull().default(""),
  proofUrl: text("proof_url"),
  proofName: text("proof_name"),
  adminNote: text("admin_note"),
  approvedBy: integer("approved_by"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
