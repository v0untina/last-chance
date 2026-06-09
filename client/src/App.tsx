import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { applyInitialTheme } from "@/stores/theme";
import { useAuth } from "@/stores/auth";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { PageLoader } from "@/components/ui/PageLoader";
import "@/i18n";

import HomePage from "@/pages/HomePage";
import CatalogPage from "@/pages/CatalogPage";
import AlgorithmPage from "@/pages/AlgorithmPage";
import TheoryTab from "@/pages/tabs/TheoryTab";
import VisualizationTab from "@/pages/tabs/VisualizationTab";
import TestTab from "@/pages/tabs/TestTab";
import PracticeTab from "@/pages/tabs/PracticeTab";
import ProgressPage from "@/pages/ProgressPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ProfilePage from "@/pages/ProfilePage";
import NotFoundPage from "@/pages/NotFoundPage";

export default function App() {
  const loadUser = useAuth((s) => s.loadUser);
  const loading = useAuth((s) => s.loading);

  useEffect(() => {
    applyInitialTheme();
    loadUser();
  }, [loadUser]);

  if (loading) return <PageLoader label="Загрузка…" />;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />

          <Route path="catalog" element={<CatalogPage />} />

          <Route path="algorithms/:id" element={<AlgorithmPage />}>
            <Route index element={<TheoryTab />} />
            <Route path="theory" element={<Navigate to=".." replace />} />
            <Route path="visualization" element={<ErrorBoundary><VisualizationTab /></ErrorBoundary>} />
            <Route path="test" element={<TestTab />} />
            <Route path="practice" element={<ErrorBoundary><PracticeTab /></ErrorBoundary>} />
          </Route>

          <Route path="progress" element={<ProgressPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="profile" element={<ProfilePage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: "var(--bg-elev)", color: "var(--fg)", border: "1px solid var(--border)" },
          duration: 4000,
        }}
      />
    </BrowserRouter>
  );
}
