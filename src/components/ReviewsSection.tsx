import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StarRating } from './StarRating';
import { MessageSquare, Send } from 'lucide-react';
import { format } from 'date-fns';
import { reviewCreateSchema, validateWithSchema, formatValidationErrors, sanitizeString, VALIDATION_CONSTANTS } from '@/lib/validation-schemas';

interface Review {
  id: string;
  client_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  profile?: { display_name: string };
}

interface ReviewsSectionProps {
  barbershopId: string;
  currentUserId?: string;
}

export const ReviewsSection = ({ barbershopId, currentUserId }: ReviewsSectionProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchReviews();

    const channel = supabase
      .channel('reviews-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reviews',
          filter: `barbershop_id=eq.${barbershopId}`
        },
        () => {
          fetchReviews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbershopId, currentUserId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { data: reviewsData, error } = await supabase
        .from('reviews')
        .select('id, client_id, rating, comment, created_at, updated_at')
        .eq('barbershop_id', barbershopId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const clientIds = [...new Set(reviewsData?.map(r => r.client_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', clientIds);

      const profilesMap = new Map<string, { user_id: string; display_name: string }>();
      profilesData?.forEach(p => profilesMap.set(p.user_id, p));

      const mappedReviews: Review[] = reviewsData?.map(review => ({
        ...review,
        profile: profilesMap.get(review.client_id)
      })) || [];

      setReviews(mappedReviews);

      if (currentUserId) {
        const existingReview = mappedReviews.find(r => r.client_id === currentUserId);
        if (existingReview) {
          setUserReview(existingReview);
          setRating(existingReview.rating);
          setComment(existingReview.comment || '');
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar avaliações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!currentUserId) {
      toast({
        title: 'Faça login',
        description: 'Você precisa estar logado para avaliar',
        variant: 'destructive'
      });
      return;
    }

    // Validação com Zod
    const reviewData = {
      barbershop_id: barbershopId,
      rating: rating,
      comment: comment ? sanitizeString(comment) : null,
    };

    const validation = validateWithSchema(reviewCreateSchema, reviewData);
    if (!validation.success) {
      toast({
        title: 'Erro de validação',
        description: formatValidationErrors(validation.errors),
        variant: 'destructive'
      });
      return;
    }

    // Verificar comprimento do comentário
    if (comment && comment.length > VALIDATION_CONSTANTS.COMMENT_MAX_LENGTH) {
      toast({
        title: 'Erro de validação',
        description: `Comentário deve ter no máximo ${VALIDATION_CONSTANTS.COMMENT_MAX_LENGTH} caracteres`,
        variant: 'destructive'
      });
      return;
    }

    try {
      setSubmitting(true);

      if (userReview) {
        const { error } = await supabase
          .from('reviews')
          .update({
            rating: validation.data.rating,
            comment: validation.data.comment
          })
          .eq('id', userReview.id);

        if (error) throw error;

        toast({
          title: 'Avaliação atualizada',
          description: 'Sua avaliação foi atualizada com sucesso'
        });
      } else {
        const { error } = await supabase
          .from('reviews')
          .insert({
            client_id: currentUserId,
            barbershop_id: validation.data.barbershop_id,
            rating: validation.data.rating,
            comment: validation.data.comment
          });

        if (error) throw error;

        toast({
          title: 'Avaliação enviada',
          description: 'Obrigado por avaliar!'
        });
      }

      fetchReviews();
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar avaliação',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {currentUserId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {userReview ? 'Editar Minha Avaliação' : 'Avaliar Barbearia'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Sua nota:</p>
              <StarRating rating={rating} onRatingChange={setRating} size="lg" />
            </div>

            <div className="space-y-2">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Compartilhe sua experiência (opcional)"
                rows={3}
              />
            </div>

            <Button 
              onClick={handleSubmitReview} 
              disabled={submitting || rating === 0}
              className="w-full gap-2"
            >
              <Send className="h-4 w-4" />
              {userReview ? 'Atualizar Avaliação' : 'Enviar Avaliação'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Avaliações dos Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground">Carregando avaliações...</p>
          ) : reviews.length === 0 ? (
            <p className="text-center text-muted-foreground">
              Ainda não há avaliações. Seja o primeiro a avaliar!
            </p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="pt-4">
                    <div className="flex gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {review.profile?.display_name?.charAt(0).toUpperCase() || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">
                            {review.profile?.display_name || 'Cliente'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(review.created_at), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        <StarRating rating={review.rating} readonly size="sm" />
                        {review.comment && (
                          <p className="text-sm text-muted-foreground">{review.comment}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
