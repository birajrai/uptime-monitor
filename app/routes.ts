import { type RouteConfig, route, layout } from "@react-router/dev/routes";

export default [
  // Auth routes (no layout)
  route("setup", "routes/setup.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),

  // Public routes
  route("status/:slug", "routes/status.$slug.tsx"),

  // API routes
  route("api/cron", "routes/api.cron.tsx"),
  route("api/monitors/:id/check", "routes/api.monitors.$id.check.tsx"),
  route("api/webhooks/:id/test", "routes/api.webhooks.$id.test.tsx"),

  // Protected routes (require auth)
  layout("routes/_protected.tsx", [
    route("", "routes/_index.tsx"),
    route("monitors/new", "routes/monitors.new.tsx"),
    route("monitors/:id", "routes/monitors.$id.tsx"),
    route("status-pages", "routes/status-pages.tsx"),
    route("status-pages/new", "routes/status-pages.new.tsx"),
    route("status-pages/:id/edit", "routes/status-pages.$id.edit.tsx"),
  ]),
] satisfies RouteConfig;
