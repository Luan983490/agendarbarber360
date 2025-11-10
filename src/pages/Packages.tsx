import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { Search, Package, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientPackage {
  id: string;
  purchase_date: string;
  expiry_date: string;
  sessions_remaining: number;
  sessions_total: number;
  status: string;
  package: {
    name: string;
    description: string;
  };
  barbershop: {
    name: string;
  };
}

const Packages = () => {
  const { user, loading: authLoading } = useAuth();
  const [packages, setPackages] = useState<ClientPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchPackages();
    }
  }, [user]);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('client_packages')
        .select(`
          *,
          package:packages(name, description),
          barbershop:barbershops(name)
        `)
        .eq('client_id', user?.id)
        .order('purchase_date', { ascending: false });

      if (error) throw error;
      setPackages(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar pacotes",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPackages = packages.filter(pkg =>
    pkg.package.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.barbershop.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Package className="h-8 w-8 animate-spin text-primary" />
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
          <h1 className="text-3xl font-bold mb-2">Meus Pacotes</h1>
          <p className="text-muted-foreground">
            Aqui, você pode verificar todos os seus pacotes, entender o quanto já utilizou de cada um e acessar o histórico completo de uso. Ideal para você maximizar o aproveitamento dos serviços adquiridos e planejar suas próximas visitas.
          </p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar"
              className="pl-10 bg-card"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredPackages.length > 0 ? (
            filteredPackages.map((pkg) => {
              const usagePercentage = ((pkg.sessions_total - pkg.sessions_remaining) / pkg.sessions_total) * 100;
              
              return (
                <Card key={pkg.id}>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{pkg.package.name}</h3>
                          <p className="text-sm text-muted-foreground">{pkg.barbershop.name}</p>
                          {pkg.package.description && (
                            <p className="text-sm text-muted-foreground mt-1">{pkg.package.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            {pkg.sessions_remaining}/{pkg.sessions_total}
                          </p>
                          <p className="text-sm text-muted-foreground">sessões restantes</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Progress value={usagePercentage} className="h-2" />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Comprado em {format(new Date(pkg.purchase_date), "d 'de' MMM 'de' yyyy", { locale: ptBR })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Válido até {format(new Date(pkg.expiry_date), "d 'de' MMM 'de' yyyy", { locale: ptBR })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Nenhum pacote encontrado</h3>
                <p className="text-muted-foreground">
                  Você ainda não adquiriu nenhum pacote de serviços
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Packages;
