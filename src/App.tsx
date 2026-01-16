import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { defaultQueryClientConfig } from "@/lib/query-config";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useSupabasePing } from "@/hooks/use-supabase-ping";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Skeleton } from "@/components/ui/skeleton";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

// Loading fallback component
import b360Logo from '@/assets/b360-logo.png';

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="text-center">
      <img src={b360Logo} alt="B360" className="h-16 mx-auto mb-4 animate-pulse" />
      <p className="text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

// Public pages (eager load - critical path)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

// Admin pages (lazy load - heavy components)
const Dashboard = lazy(() => import("./pages/Dashboard"));

// Barber pages (lazy load)
const BarberHoje = lazy(() => import("./pages/BarberHoje"));
const BarberAgenda = lazy(() => import("./pages/BarberAgenda"));
const BarberPerformance = lazy(() => import("./pages/BarberPerformance"));

// Client pages (lazy load)
const MyBookings = lazy(() => import("./pages/MyBookings"));
const BookingsHistory = lazy(() => import("./pages/BookingsHistory"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Profile = lazy(() => import("./pages/Profile"));

// Legacy routes (lazy load)
const BarberDashboard = lazy(() => import("./pages/BarberDashboard"));
const AttendantDashboard = lazy(() => import("./pages/AttendantDashboard"));
const Packages = lazy(() => import("./pages/Packages"));
const Subscriptions = lazy(() => import("./pages/Subscriptions"));
const Cards = lazy(() => import("./pages/Cards"));

const queryClient = new QueryClient(defaultQueryClientConfig);

const AppContent = () => {
  useSupabasePing();
  
  return (
    <>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* Admin Routes (Owner only) */}
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['owner']}>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['owner']}>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Barber Routes */}
            <Route 
              path="/barber/hoje" 
              element={
                <ProtectedRoute allowedRoles={['barber']}>
                  <BarberHoje />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/barber/agenda" 
              element={
                <ProtectedRoute allowedRoles={['barber']}>
                  <BarberAgenda />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/barber/performance" 
              element={
                <ProtectedRoute allowedRoles={['barber']}>
                  <BarberPerformance />
                </ProtectedRoute>
              } 
            />
            
            {/* Legacy barber route - redirect to new */}
            <Route 
              path="/barber-dashboard" 
              element={<Navigate to="/barber/hoje" replace />} 
            />
            
            {/* Attendant Routes */}
            <Route 
              path="/attendant/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['attendant']}>
                  <AttendantDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Legacy attendant route - redirect to new */}
            <Route 
              path="/attendant-dashboard" 
              element={<Navigate to="/attendant/dashboard" replace />} 
            />
            
            {/* Client Routes (client only) */}
            <Route 
              path="/my-bookings" 
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <MyBookings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/historico" 
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <BookingsHistory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/favoritos" 
              element={
                <ProtectedRoute allowedRoles={['client']}>
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
            
            {/* Legacy client routes - kept for backwards compatibility */}
            <Route 
              path="/pacotes" 
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <Packages />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/assinaturas" 
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <Subscriptions />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/cartoes" 
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <Cards />
                </ProtectedRoute>
              } 
            />
            
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
