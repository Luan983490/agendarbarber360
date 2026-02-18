import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { defaultQueryClientConfig } from "@/lib/query-config";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useSupabasePing } from "@/hooks/use-supabase-ping";
import { usePendingBooking } from "@/hooks/usePendingBooking";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

import b360Logo from '@/assets/b360-logo.png';

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="text-center">
      <img src={b360Logo} alt="B360" className="h-16 mx-auto mb-4 animate-pulse" />
      <p className="text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

// Public pages (eager load)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const BarbershopPage = lazy(() => import("./pages/BarbershopPage"));
const ClientAuth = lazy(() => import("./pages/auth/ClientAuth"));

// MFA verification (lazy)
const VerifyMFA = lazy(() => import("./pages/VerifyMFA"));

// Client pages (lazy)
const MyBookings = lazy(() => import("./pages/MyBookings"));
const BookingsHistory = lazy(() => import("./pages/BookingsHistory"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Profile = lazy(() => import("./pages/Profile"));
const Packages = lazy(() => import("./pages/Packages"));
const Subscriptions = lazy(() => import("./pages/Subscriptions"));
const Cards = lazy(() => import("./pages/Cards"));

const queryClient = new QueryClient(defaultQueryClientConfig);

const PendingBookingHandler = () => {
  usePendingBooking();
  return null;
};

const AppContent = () => {
  useSupabasePing();
  return (
    <>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <BrowserRouter>
        <PendingBookingHandler />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Navigate to="/login" replace />} />
            <Route path="/choose-type" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<ClientAuth />} />
            <Route path="/login/client" element={<Navigate to="/login" replace />} />
            <Route path="/signup" element={<ClientAuth />} />
            <Route path="/signup/client" element={<Navigate to="/signup" replace />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-mfa" element={<VerifyMFA />} />
            <Route path="/barbearia/:slug" element={<BarbershopPage />} />

            {/* Client Routes (authenticated) */}
            <Route 
              path="/my-bookings" 
              element={
                <ProtectedRoute>
                  <MyBookings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/historico" 
              element={
                <ProtectedRoute>
                  <BookingsHistory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/favoritos" 
              element={
                <ProtectedRoute>
                  <Favorites />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/perfil" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/pacotes" 
              element={
                <ProtectedRoute>
                  <Packages />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/assinaturas" 
              element={
                <ProtectedRoute>
                  <Subscriptions />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/cartoes" 
              element={
                <ProtectedRoute>
                  <Cards />
                </ProtectedRoute>
              } 
            />

            {/* Legacy redirects for owner/barber routes */}
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/admin/*" element={<Navigate to="/" replace />} />
            <Route path="/barber/*" element={<Navigate to="/" replace />} />
            <Route path="/attendant/*" element={<Navigate to="/" replace />} />
            <Route path="/onboarding/*" element={<Navigate to="/" replace />} />
            <Route path="/planos" element={<Navigate to="/" replace />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider delayDuration={300} skipDelayDuration={100} disableHoverableContent>
          <AppContent />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
