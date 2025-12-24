import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useSupabasePing } from "@/hooks/use-supabase-ping";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Public pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Admin pages
import Dashboard from "./pages/Dashboard";

// Barber pages
import BarberHoje from "./pages/BarberHoje";
import BarberAgenda from "./pages/BarberAgenda";

// Client pages (kept for future use)
import MyBookings from "./pages/MyBookings";
import BookingsHistory from "./pages/BookingsHistory";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";

// Legacy routes - to be removed
import BarberDashboard from "./pages/BarberDashboard";
import AttendantDashboard from "./pages/AttendantDashboard";
import Packages from "./pages/Packages";
import Subscriptions from "./pages/Subscriptions";
import Cards from "./pages/Cards";

const queryClient = new QueryClient();

const AppContent = () => {
  useSupabasePing();
  
  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          
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
              <ProtectedRoute allowedRoles={['client']}>
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
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
