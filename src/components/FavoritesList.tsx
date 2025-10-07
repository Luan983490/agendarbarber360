import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Heart, MapPin, Star, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FavoriteBarbershop {
  id: string;
  name: string;
  address: string;
  image_url?: string;
  rating: number;
  total_reviews: number;
}

interface FavoritesListProps {
  userId: string;
}

const FavoritesList = ({ userId }: FavoritesListProps) => {
  const [favorites, setFavorites] = useState<FavoriteBarbershop[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchFavorites();

    // Setup realtime subscription
    const channel = supabase
      .channel('favorites-list-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'favorites',
          filter: `client_id=eq.${userId}`
        },
        () => {
          fetchFavorites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchFavorites = async () => {
    try {
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('favorites')
        .select('barbershop_id')
        .eq('client_id', userId);

      if (favoritesError) throw favoritesError;

      if (!favoritesData || favoritesData.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      const barbershopIds = favoritesData.map(f => f.barbershop_id);

      const { data: barbershopsData, error: barbershopsError } = await supabase
        .from('barbershops')
        .select('id, name, address, image_url, rating, total_reviews')
        .in('id', barbershopIds);

      if (barbershopsError) throw barbershopsError;

      setFavorites(barbershopsData || []);
    } catch (error: any) {
      console.error('Error fetching favorites:', error);
      toast({
        title: "Erro ao carregar favoritos",
        description: error.message || "Não foi possível carregar seus favoritos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (barbershopId: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('client_id', userId)
        .eq('barbershop_id', barbershopId);

      if (error) throw error;

      setFavorites(prev => prev.filter(b => b.id !== barbershopId));

      toast({
        title: "Removido dos favoritos",
        description: "Barbearia removida dos favoritos com sucesso"
      });
    } catch (error: any) {
      console.error('Error removing favorite:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível remover dos favoritos",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Minhas Barbearias Favoritas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando favoritos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 fill-red-500 text-red-500" />
          Minhas Barbearias Favoritas
        </CardTitle>
        <CardDescription>
          {favorites.length === 0
            ? 'Você ainda não tem barbearias favoritas'
            : `${favorites.length} ${favorites.length === 1 ? 'barbearia favorita' : 'barbearias favoritas'}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {favorites.length === 0 ? (
          <div className="text-center py-8">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Comece a favoritar suas barbearias preferidas para vê-las aqui!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {favorites.map((barbershop) => (
              <Card key={barbershop.id} className="overflow-hidden">
                <div className="aspect-video relative overflow-hidden bg-muted">
                  {barbershop.image_url ? (
                    <img
                      src={barbershop.image_url}
                      alt={barbershop.name}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Heart className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{barbershop.name}</h3>
                  
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{barbershop.address}</span>
                  </div>

                  <div className="flex items-center gap-1 mb-3">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{barbershop.rating.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">
                      ({barbershop.total_reviews} {barbershop.total_reviews === 1 ? 'avaliação' : 'avaliações'})
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/?barbershop=${barbershop.id}`)}
                    >
                      Ver Perfil
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeFavorite(barbershop.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FavoritesList;
