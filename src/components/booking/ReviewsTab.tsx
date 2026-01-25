import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Review {
  id: string;
  client_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profile?: { display_name: string };
}

interface ReviewsTabProps {
  barbershopId: string;
}

export const ReviewsTab = ({ barbershopId }: ReviewsTabProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const { data: reviewsData, error } = await supabase
          .from("reviews")
          .select("id, client_id, rating, comment, created_at")
          .eq("barbershop_id", barbershopId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;

        const clientIds = [...new Set(reviewsData?.map((r) => r.client_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", clientIds);

        const profilesMap = new Map<string, { display_name: string }>();
        profilesData?.forEach((p) =>
          profilesMap.set(p.user_id, { display_name: p.display_name || "Cliente" })
        );

        const mappedReviews: Review[] =
          reviewsData?.map((review) => ({
            ...review,
            profile: profilesMap.get(review.client_id),
          })) || [];

        setReviews(mappedReviews);
      } catch (error) {
        console.error("Erro ao carregar avaliações:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [barbershopId]);

  if (loading) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Carregando avaliações...
      </p>
    );
  }

  if (reviews.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Ainda não há avaliações
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <Card key={review.id} className="border-border">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {review.profile?.display_name?.charAt(0).toUpperCase() || "C"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground text-sm">
                    {review.profile?.display_name || "Cliente"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(review.created_at), "dd/MM/yyyy")}
                  </p>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "w-3.5 h-3.5",
                        star <= review.rating
                          ? "text-amber-500 fill-amber-500"
                          : "text-muted-foreground"
                      )}
                    />
                  ))}
                </div>
                {review.comment && (
                  <p className="text-sm text-muted-foreground">{review.comment}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
