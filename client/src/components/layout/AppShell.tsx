import { Outlet } from "react-router-dom";
import { Header } from "./Header";

export function AppShell() {
  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-border py-4 text-center text-xs text-fg-subtle">
        © 2026 Электронный учебник «Алгоритмы и структуры данных»
      </footer>
    </div>
  );
}
