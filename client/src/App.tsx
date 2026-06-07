import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuth } from "@/stores/auth";
import { applyInitialTheme } from "@/stores/theme";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import "@/i18n";

import HomePage from "@/pages/HomePage";
import CatalogPage from "@/pages/CatalogPage";
import AlgorithmPage from "@/pages/AlgorithmPage";
import TheoryTab from "@/pages/tabs/TheoryTab";
import VisualizationTab from "@/pages/tabs/VisualizationTab";
import TestTab from "@/pages/tabs/TestTab";
import PracticeTab from "@/pages/tabs/PracticeTab";
import ProgressPage from "@/pages/ProgressPage";
import AdminPage from "@/pages/AdminPage";
import NotFoundPage from "@/pages/NotFoundPage";

export default function App() {
  const { initialize } = useAuth();

  useEffect(() => { applyInitialTheme(); initialize(); }, [initialize]);

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
          <Route path="admin" element={<AdminPage />} />

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
