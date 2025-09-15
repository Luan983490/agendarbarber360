import { useState } from "react";
import { Header } from "@/components/Header";
import { SearchFilters } from "@/components/SearchFilters";
import { BarberShopGrid } from "@/components/BarberShopGrid";
import { LocationSearch } from "@/components/LocationSearch";
import { Hero } from "@/components/Hero";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [location, setLocation] = useState("");

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
          
          <SearchFilters 
            activeFilters={activeFilters}
            onFiltersChange={setActiveFilters}
          />
          
          <BarberShopGrid 
            searchQuery={searchQuery}
            activeFilters={activeFilters}
            location={location}
          />
        </section>
      </main>
    </div>
  );
};

export default Index;