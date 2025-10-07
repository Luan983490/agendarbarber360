import { useState } from "react";
import { Header } from "@/components/Header";
import { SearchFilters } from "@/components/SearchFilters";
import { BarberShopGrid } from "@/components/BarberShopGrid";
import { LocationSearch } from "@/components/LocationSearch";
import { Hero } from "@/components/Hero";
import FavoritesList from "@/components/FavoritesList";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const { user } = useAuth();

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