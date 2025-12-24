import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { SearchFilters } from "@/components/SearchFilters";
import { BarberShopGrid } from "@/components/BarberShopGrid";
import { LocationSearch } from "@/components/LocationSearch";
import { Hero } from "@/components/Hero";
import FavoritesList from "@/components/FavoritesList";
import { useAuth } from "@/hooks/useAuth";
import { useUserAccess } from "@/hooks/useUserAccess";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scissors } from "lucide-react";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const { user } = useAuth();
  const { role, loading } = useUserAccess();
  const navigate = useNavigate();

  // Redirect users with internal roles to their dashboards
  useEffect(() => {
    if (!loading && user && (role === 'owner' || role === 'barber' || role === 'attendant')) {
      if (role === 'owner') {
        navigate('/dashboard', { replace: true });
      } else if (role === 'barber') {
        navigate('/barber/hoje', { replace: true });
      } else if (role === 'attendant') {
        navigate('/attendant/dashboard', { replace: true });
      }
    }
  }, [user, role, loading, navigate]);

  // Show loading while checking user role
  if (loading && user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Scissors className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        <Hero />
        
        <section className="container mx-auto px-4 py-8">
          <LocationSearch 
            location={location}
            onLocationChange={setLocation}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
          
          {user ? (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto mb-6 grid-cols-2">
                <TabsTrigger value="all">Todas as Barbearias</TabsTrigger>
                <TabsTrigger value="favorites">Meus Favoritos</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all">
                <SearchFilters 
                  activeFilters={activeFilters}
                  onFiltersChange={setActiveFilters}
                />
                
                <BarberShopGrid 
                  searchQuery={searchQuery}
                  activeFilters={activeFilters}
                  location={location}
                />
              </TabsContent>
              
              <TabsContent value="favorites">
                <FavoritesList userId={user.id} />
              </TabsContent>
            </Tabs>
          ) : (
            <>
              <SearchFilters 
                activeFilters={activeFilters}
                onFiltersChange={setActiveFilters}
              />
              
              <BarberShopGrid 
                searchQuery={searchQuery}
                activeFilters={activeFilters}
                location={location}
              />
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default Index;