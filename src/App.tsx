import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useSupabasePing } from "@/hooks/use-supabase-ping";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import BarberDashboard from "./pages/BarberDashboard";
import AttendantDashboard from "./pages/AttendantDashboard";
import MyBookings from "./pages/MyBookings";
import BookingsHistory from "./pages/BookingsHistory";
import Packages from "./pages/Packages";
import Subscriptions from "./pages/Subscriptions";
import Cards from "./pages/Cards";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  useSupabasePing();
  
  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/barber-dashboard" element={<BarberDashboard />} />
          <Route path="/attendant-dashboard" element={<AttendantDashboard />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/historico" element={<BookingsHistory />} />
          <Route path="/pacotes" element={<Packages />} />
          <Route path="/assinaturas" element={<Subscriptions />} />
          <Route path="/cartoes" element={<Cards />} />
          <Route path="/favoritos" element={<Favorites />} />
          <Route path="/perfil" element={<Profile />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
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
