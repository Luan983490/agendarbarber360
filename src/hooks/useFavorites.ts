import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useFavorites = (userId: string | undefined) => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setFavorites(new Set());
      setLoading(false);
      return;
    }

    fetchFavorites();

    // Setup realtime subscription
    const channel = supabase
      .channel('favorites-changes')
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
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('barbershop_id')
        .eq('client_id', userId);

      if (error) throw error;

      setFavorites(new Set(data.map(f => f.barbershop_id)));
    } catch (error: any) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (barbershopId: string) => {
    if (!userId) {
      toast({
        title: "Faça login",
        description: "Você precisa estar logado para favoritar barbearias",
        variant: "destructive"
      });
      return;
    }

    const isFavorited = favorites.has(barbershopId);

    try {
      if (isFavorited) {
        // Remove favorite
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('client_id', userId)
          .eq('barbershop_id', barbershopId);

        if (error) throw error;

        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(barbershopId);
          return newSet;
        });

        toast({
          title: "Removido dos favoritos",
          description: "Barbearia removida dos favoritos com sucesso"
        });
      } else {
        // Add favorite
        const { error } = await supabase
          .from('favorites')
          .insert({
            client_id: userId,
            barbershop_id: barbershopId
          });

        if (error) throw error;

        setFavorites(prev => new Set([...prev, barbershopId]));

        toast({
          title: "Adicionado aos favoritos",
          description: "Barbearia adicionada aos favoritos com sucesso"
        });
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar favoritos",
        variant: "destructive"
      });
    }
  };

  return {
    favorites,
    loading,
    isFavorited: (barbershopId: string) => favorites.has(barbershopId),
    toggleFavorite
  };
};
