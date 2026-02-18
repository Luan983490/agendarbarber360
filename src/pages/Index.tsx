import { useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { BarberShopGrid } from "@/components/BarberShopGrid";
import { AdvancedSearch, SearchType } from "@/components/AdvancedSearch";
import { useAuth } from "@/hooks/useAuth";
import { ClientBottomNav } from "@/components/ClientBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [searchType, setSearchType] = useState<SearchType>('name');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [userLatitude, setUserLatitude] = useState<number | null>(null);
  const [userLongitude, setUserLongitude] = useState<number | null>(null);
  const [isProximityActive, setIsProximityActive] = useState(false);
  
  const { user } = useAuth();

  const handleProximitySearch = useCallback((lat: number, lng: number) => {
    setUserLatitude(lat);
    setUserLongitude(lng);
    setIsProximityActive(true);
  }, []);

  const handleClearProximity = useCallback(() => {
    setUserLatitude(null);
    setUserLongitude(null);
    setIsProximityActive(false);
  }, []);

  const handleSearchTypeChange = (type: SearchType) => {
    setSearchType(type);
    if (type !== 'name') setSearchQuery("");
    if (type !== 'city') setSelectedCity(null);
    if (type !== 'proximity') handleClearProximity();
  };

  const showClientNav = isMobile;

  return (
    <div className="min-h-screen bg-background">
      <Header hideMobileMenu={showClientNav} />
      
      <main className={showClientNav ? "pt-20 pb-24" : "pt-20"}>
        <section className="container mx-auto px-4 py-8">
          <AdvancedSearch
            searchType={searchType}
            onSearchTypeChange={handleSearchTypeChange}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCity={selectedCity}
            onCityChange={setSelectedCity}
            onProximitySearch={handleProximitySearch}
            onClearProximity={handleClearProximity}
            isProximityActive={isProximityActive}
          />
          
          <BarberShopGrid 
            searchQuery={searchQuery}
            activeFilters={[]}
            location={location}
            searchType={searchType}
            selectedCity={selectedCity}
            userLatitude={userLatitude}
            userLongitude={userLongitude}
          />
        </section>
      </main>
      {showClientNav && <ClientBottomNav />}
    </div>
  );
};

export default Index;
