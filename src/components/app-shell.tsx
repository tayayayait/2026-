import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Home, MapPin, Sprout } from "lucide-react";
import type { ReactNode } from "react";

const tabs = [
  { to: "/", label: "홈", icon: Home },
  { to: "/farms/new", label: "농장 등록", icon: MapPin },
  { to: "/alerts", label: "알림", icon: Bell },
] as const;

const isActivePath = (pathname: string, target: (typeof tabs)[number]["to"]) =>
  pathname === target || pathname.startsWith(`${target}/`);

export function AppShell({
  children,
  title,
  subtitle,
  right,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
        <Link to="/" className="flex items-center gap-2 px-5 h-16 border-b border-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sprout className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold">Farm-Sync</div>
            <div className="text-[11px] text-muted-foreground">농생명 리스크 대응 AI</div>
          </div>
        </Link>
        <nav className="p-3 space-y-1">
          {tabs.map((tab) => {
            const active = isActivePath(pathname, tab.to);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`relative flex h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active
                    ? "bg-primary/10 text-primary font-semibold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r before:bg-primary"
                    : "text-foreground/80 hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto p-4 text-[11px] text-muted-foreground border-t border-border">
          <div className="font-semibold text-foreground/80 mb-1">데이터 출처</div>
          기상청 · NCPMS · PERS · KAMIS · 농업기상 · 농기계임대
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {(title || right) ? (
          <header className="border-b border-border bg-card">
            <div className="flex items-center justify-between gap-4 px-4 md:px-8 h-16">
              <div className="min-w-0">
                {title ? <h1 className="text-lg md:text-xl font-bold truncate">{title}</h1> : null}
                {subtitle ? <p className="text-xs text-muted-foreground truncate">{subtitle}</p> : null}
              </div>
              {right}
            </div>
          </header>
        ) : null}
        <main className="flex-1 pb-24 lg:pb-8">{children}</main>

        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border">
          <div className="grid grid-cols-3">
            {tabs.map((tab) => {
              const active = isActivePath(pathname, tab.to);
              const Icon = tab.icon;

              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={`flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 py-2.5 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${active ? "text-primary font-semibold" : "text-muted-foreground"}`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
