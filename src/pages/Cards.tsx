import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { CreditCard, Plus } from 'lucide-react';

interface PaymentCard {
  id: string;
  card_brand: string;
  last_four_digits: string;
  cardholder_name: string;
  expiry_month: number;
  expiry_year: number;
  is_default: boolean;
}

const Cards = () => {
  const { user, loading: authLoading } = useAuth();
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchCards();
    }
  }, [user]);

  const fetchCards = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_cards')
        .select('*')
        .eq('client_id', user?.id)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setCards(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar cartões",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getCardIcon = (brand: string) => {
    const brandColors: Record<string, string> = {
      visa: 'bg-blue-500',
      mastercard: 'bg-red-500',
      amex: 'bg-blue-600',
      elo: 'bg-yellow-500',
      default: 'bg-gray-500'
    };
    return brandColors[brand.toLowerCase()] || brandColors.default;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CreditCard className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 mt-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Meus Cartões</h1>
          <p className="text-muted-foreground">
            Com o recurso de pagamento online, você agiliza o pagamento de seus agendamentos de maneira segura e ainda tem a chance de explorar e aderir a clubes de assinaturas, além de comprar pacotes diversos.
          </p>
        </div>

        <div className="space-y-6">
          {cards.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {cards.map((card) => (
                <Card key={card.id} className={`${getCardIcon(card.card_brand)} text-white overflow-hidden`}>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="text-sm uppercase font-semibold">{card.card_brand}</div>
                      {card.is_default && (
                        <span className="text-xs bg-white/20 px-2 py-1 rounded">Principal</span>
                      )}
                    </div>
                    
                    <div className="text-2xl font-bold tracking-wider">
                      •••• •••• •••• {card.last_four_digits}
                    </div>
                    
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-xs opacity-80">Nome do titular</div>
                        <div className="font-semibold">{card.cardholder_name}</div>
                      </div>
                      <div>
                        <div className="text-xs opacity-80">Validade</div>
                        <div className="font-semibold">
                          {String(card.expiry_month).padStart(2, '0')}/{card.expiry_year}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-16">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="w-32 h-24 bg-blue-500 rounded-lg shadow-lg transform -rotate-12"></div>
                    <div className="w-32 h-24 bg-gray-200 rounded-lg shadow-lg absolute top-2 left-6"></div>
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-2">Nenhum cartão encontrado.</h3>
                <p className="text-muted-foreground mb-6">
                  Adicione um cartão para realizar pagamentos online
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Cartão
                </Button>
              </CardContent>
            </Card>
          )}
          
          {cards.length > 0 && (
            <div className="flex justify-center">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Cartão
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Cards;
