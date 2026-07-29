import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  serial,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const monitors = pgTable("monitors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  checkIntervalSeconds: integer("check_interval_seconds").notNull().default(60),
  isActive: boolean("is_active").notNull().default(true),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const uptimeLogs = pgTable("uptime_logs", {
  id: serial("id").primaryKey(),
  monitorId: integer("monitor_id")
    .notNull()
    .references(() => monitors.id, { onDelete: "cascade" }),
  statusCode: integer("status_code"),
  isUp: boolean("is_up").notNull(),
  responseTimeMs: integer("response_time_ms"),
  errorMessage: text("error_message"),
  checkedAt: timestamp("checked_at").defaultNow().notNull(),
});

export const statusPages = pgTable("status_pages", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const statusPageMonitors = pgTable("status_page_monitors", {
  id: serial("id").primaryKey(),
  statusPageId: integer("status_page_id")
    .notNull()
    .references(() => statusPages.id, { onDelete: "cascade" }),
  monitorId: integer("monitor_id")
    .notNull()
    .references(() => monitors.id, { onDelete: "cascade" }),
  displayOrder: integer("display_order").notNull().default(0),
});

export const monitorWebhooks = pgTable("monitor_webhooks", {
  id: serial("id").primaryKey(),
  monitorId: integer("monitor_id")
    .notNull()
    .references(() => monitors.id, { onDelete: "cascade" }),
  webhookUrl: text("webhook_url").notNull(),
  notifyOnDown: boolean("notify_on_down").notNull().default(true),
  notifyOnUp: boolean("notify_on_up").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
