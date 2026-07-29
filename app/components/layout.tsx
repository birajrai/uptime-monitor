import { Link, Outlet, Form, useLocation } from "react-router";
import { House, Monitor, Globe, SignOut } from "@phosphor-icons/react";
import { cn } from "~/lib/utils";
import type { SessionData } from "~/lib/auth";

const navItems = [
  { to: "/", label: "Dashboard", icon: House },
  { to: "/monitors/new", label: "Monitors", icon: Monitor },
  { to: "/status-pages", label: "Status Pages", icon: Globe },
];

export default function Layout({
  session,
  children,
}: {
  session: SessionData;
  children?: React.ReactNode;
}) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-14 items-center border-b border-gray-200 px-6">
          <Link to="/" className="text-lg font-bold tracking-tight">
            Uptimer
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const isActive =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-3">
          <div className="mb-2 px-3 text-xs text-gray-500 truncate">
            {session.email}
          </div>
          <Form method="post" action="/logout">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              <SignOut className="h-4 w-4" />
              Sign out
            </button>
          </Form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl p-8">{children ?? <Outlet />}</div>
      </main>
    </div>
  );
}
