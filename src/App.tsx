import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { VoiceCopilot } from "@/components/ai/VoiceCopilot";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Licitacoes = lazy(() => import("./pages/Licitacoes"));
const LicitacoesPortal = lazy(() => import("./pages/LicitacoesPortal"));
const Admin = lazy(() => import("./pages/Admin"));
const Manual = lazy(() => import("./pages/Manual"));
const Conectores = lazy(() => import("./pages/Conectores"));
const Medicamentos = lazy(() => import("./pages/Medicamentos"));
const Empreendimentos = lazy(() => import("./pages/Empreendimentos"));
const Empresas = lazy(() => import("./pages/Empresas"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MinhasParticipacoes = lazy(() => import("./pages/MinhasParticipacoes"));
const Administrativo = lazy(() => import("./pages/Administrativo"));

// Create QueryClient with error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5000,
      refetchOnWindowFocus: false,
    },
  },
});

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

// Redirect authenticated users away from auth page
const AuthRoute = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingFallback />;
  }
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return <Auth />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<AuthRoute />} />
    <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
    <Route path="/manual" element={<ProtectedRoute><Manual /></ProtectedRoute>} />
    <Route path="/conectores" element={<ProtectedRoute><Conectores /></ProtectedRoute>} />
    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
    <Route path="/licitacoes" element={<ProtectedRoute><Licitacoes /></ProtectedRoute>} />
    <Route path="/portal" element={<ProtectedRoute><LicitacoesPortal /></ProtectedRoute>} />
    <Route path="/medicamentos" element={<ProtectedRoute><Medicamentos /></ProtectedRoute>} />
    <Route path="/empreendimentos" element={<ProtectedRoute><Empreendimentos /></ProtectedRoute>} />
    <Route path="/empresas" element={<ProtectedRoute><Empresas /></ProtectedRoute>} />
    <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
    <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
    <Route path="/participacoes" element={<ProtectedRoute><MinhasParticipacoes /></ProtectedRoute>} />
    <Route path="/administrativo" element={<ProtectedRoute><Administrativo /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<LoadingFallback />}>
              <AppRoutes />
            </Suspense>
            <VoiceCopilot />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
