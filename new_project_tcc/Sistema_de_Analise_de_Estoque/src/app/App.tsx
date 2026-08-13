import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Toaster } from "sonner";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { Produtos } from "./components/Produtos";
import { Estoque } from "./components/Estoque";
import { AnaliseIA } from "./components/AnaliseIA";
import { LoginPage } from "../pages/LoginPage";
import { useAuthStore } from "../store/authStore";

function ProtectedLayout() {
  const [currentView, setCurrentView] = useState("dashboard");

  const renderView = () => {
    switch (currentView) {
      case "dashboard": return <Dashboard />;
      case "produtos": return <Produtos />;
      case "estoque": return <Estoque />;
      case "analise": return <AnaliseIA />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="size-full flex bg-gray-50">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      {renderView()}
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <ProtectedLayout />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
