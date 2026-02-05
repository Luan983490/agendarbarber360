import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BarberShopGrid } from "@/components/BarberShopGrid";
import { AdvancedSearch, SearchType } from "@/components/AdvancedSearch";
import FavoritesList from "@/components/FavoritesList";
import { useAuth } from "@/hooks/useAuth";
import { useUserAccess } from "@/hooks/useUserAccess";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import b360Logo from '@/assets/b360-logo.png';

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [searchType, setSearchType] = useState<SearchType>('name');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [userLatitude, setUserLatitude] = useState<number | null>(null);
  const [userLongitude, setUserLongitude] = useState<number | null>(null);
  const [isProximityActive, setIsProximityActive] = useState(false);
  
  const { user } = useAuth();
  const { role, loading } = useUserAccess();
  const navigate = useNavigate();

  // Check if there's a pending MFA challenge
  const hasMFAPending = useMemo(() => {
    const mfaChallenge = sessionStorage.getItem('mfa_challenge');
    return !!mfaChallenge;
  }, []);

  // Redirect users with internal roles to their dashboards
  // BUT only if there's no pending MFA verification
  useEffect(() => {
    // CRITICAL: Don't redirect if MFA is pending
    if (hasMFAPending) {
      console.log('[Index] MFA pending - blocking auto-redirect to dashboard');
      navigate('/verify-mfa', { replace: true });
      return;
    }
    
    if (!loading && user && (role === 'owner' || role === 'barber' || role === 'attendant')) {
      if (role === 'owner') {
        navigate('/dashboard', { replace: true });
      } else if (role === 'barber') {
        navigate('/barber/hoje', { replace: true });
      } else if (role === 'attendant') {
        navigate('/attendant/dashboard', { replace: true });
      }
    }
  }, [user, role, loading, navigate, hasMFAPending]);

  // Handle proximity search
  const handleProximitySearch = useCallback((lat: number, lng: number) => {
    setUserLatitude(lat);
    setUserLongitude(lng);
    setIsProximityActive(true);
  }, []);

  // Clear proximity search
  const handleClearProximity = useCallback(() => {
    setUserLatitude(null);
    setUserLongitude(null);
    setIsProximityActive(false);
  }, []);

  // Handle search type change
  const handleSearchTypeChange = (type: SearchType) => {
    setSearchType(type);
    // Clear other search states when switching types
    if (type !== 'name') {
      setSearchQuery("");
    }
    if (type !== 'city') {
      setSelectedCity(null);
    }
    if (type !== 'proximity') {
      handleClearProximity();
    }
  };

  // Show loading while checking user role
  if (loading && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <img src={b360Logo} alt="B360" className="h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const renderSearchAndGrid = () => (
    <>
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
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        <section className="container mx-auto px-4 py-8">
          {user ? (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto mb-6 grid-cols-2">
                <TabsTrigger value="all">Todas as Barbearias</TabsTrigger>
                <TabsTrigger value="favorites">Meus Favoritos</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all">
                {renderSearchAndGrid()}
              </TabsContent>
              
              <TabsContent value="favorites">
                <FavoritesList userId={user.id} />
              </TabsContent>
            </Tabs>
          ) : (
            renderSearchAndGrid()
          )}
        </section>
      </main>
    </div>
  );
};

export default Index;
