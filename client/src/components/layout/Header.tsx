import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/stores/theme";
import { Moon, Sun, Languages, BookOpen, BarChart3, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function Header() {
  const { t, i18n } = useTranslation();
  const { mode, toggle } = useTheme();

  const switchLang = () => {
    const next = i18n.language.startsWith("ru") ? "en" : "ru";
    i18n.changeLanguage(next);
    document.documentElement.lang = next;
  };

  return (
    <header className="sticky top-0 z-40 bg-bg-elev/80 backdrop-blur border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="h-8 w-8 rounded-lg bg-accent text-white grid place-items-center font-bold">A</div>
          <span className="hidden sm:inline font-semibold text-fg group-hover:text-accent transition-colors">
            {t("app.title")}
          </span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="Главная навигация">
          <NavLink to="/catalog" className={({ isActive }) => cn("btn btn-ghost btn-sm", isActive && "bg-bg-subtle")}>
            <BookOpen className="h-4 w-4" />
            <span className="hidden md:inline">{t("nav.catalog")}</span>
          </NavLink>
          <NavLink to="/progress" className={({ isActive }) => cn("btn btn-ghost btn-sm", isActive && "bg-bg-subtle")}>
            <BarChart3 className="h-4 w-4" />
            <span className="hidden md:inline">{t("nav.progress")}</span>
          </NavLink>
          <NavLink to="/admin" className={({ isActive }) => cn("btn btn-ghost btn-sm", isActive && "bg-bg-subtle")}>
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden md:inline">{t("nav.admin")}</span>
          </NavLink>
        </nav>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={switchLang} aria-label={t("nav.language")}>
            <Languages className="h-4 w-4" />
            <span className="text-xs uppercase">{i18n.language.slice(0, 2)}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={toggle} aria-label={t("nav.theme")}>
            {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
