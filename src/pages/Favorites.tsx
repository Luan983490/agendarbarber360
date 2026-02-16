import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { HeartCrack } from 'lucide-react';
import { BarberShopCard } from '@/components/BarberShopCard';
import { ClientBottomNav } from '@/components/ClientBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';

const Favorites = () => {
  const isMobile = useIsMobile();
  const { user, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          barbershop:barbershops(*)
        `)
        .eq('client_id', user?.id);

      if (error) throw error;
      
      const barbershops = data?.map(fav => fav.barbershop) || [];
      setFavorites(barbershops);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar favoritos",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <HeartCrack className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header hideMobileMenu={isMobile} />
      
      <main className={`container mx-auto px-4 py-8 mt-16 ${isMobile ? 'pb-24' : ''}`}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Favoritos</h1>
        </div>

        {favorites.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {favorites.map((shop) => (
              <BarberShopCard
                key={shop.id}
                barberShop={{
                  id: shop.id,
                  name: shop.name,
                  image: shop.image_url || "/placeholder.svg",
                  rating: shop.rating || 0,
                  reviewCount: shop.total_reviews || 0,
                  distance: "--",
                  isOpen: true,
                  priceRange: "$$",
                  specialties: ["Corte", "Barba"],
                  nextAvailable: "Disponível",
                  promotions: [],
                  address: shop.address,
                }}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-16">
              <HeartCrack className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg mb-2">Nenhuma empresa encontrada</h3>
              <p className="text-muted-foreground">
                Você ainda não favoritou nenhuma barbearia
              </p>
            </CardContent>
          </Card>
        )}
      </main>
      {isMobile && <ClientBottomNav />}
    </div>
  );
};

export default Favorites;
