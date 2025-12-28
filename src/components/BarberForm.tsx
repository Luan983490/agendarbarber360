import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, User, Key, KeyRound, CheckCircle, Settings, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreateBarberAccessDialog } from './CreateBarberAccessDialog';
import { EditBarberDialog } from './EditBarberDialog';
import { CreateBarberWizard } from './CreateBarberWizard';

interface Barber {
  id: string;
  name: string;
  specialty?: string;
  phone?: string;
  image_url?: string;
  is_active: boolean;
  user_id?: string | null;
  barbershop_id: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface BarberFormProps {
  barbershopId: string;
  barbers: Barber[];
  onBarbersChange: () => void;
}

const BarberForm = ({ barbershopId, barbers, onBarbersChange }: BarberFormProps) => {
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [selectedBarberForAccess, setSelectedBarberForAccess] = useState<{ id: string; name: string } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBarberForEdit, setSelectedBarberForEdit] = useState<Barber | null>(null);
  const [createWizardOpen, setCreateWizardOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchServices();
  }, [barbershopId]);

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('id, name, price, duration')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true);
    setServices(data || []);
  };

  const handleToggleActive = async (barberId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('barbers')
        .update({ is_active: !currentStatus })
        .eq('id', barberId);

      if (error) throw error;

      toast({
        title: !currentStatus ? "Barbeiro ativado" : "Barbeiro desativado",
        description: "Status alterado com sucesso."
      });

      onBarbersChange();
    } catch (error: any) {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (barberId: string) => {
    if (!confirm('Tem certeza que deseja excluir este barbeiro?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('barbers')
        .delete()
        .eq('id', barberId);

      if (error) throw error;

      toast({
        title: "Barbeiro removido",
        description: "Profissional removido com sucesso."
      });

      onBarbersChange();
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleCreateAccess = (barber: Barber) => {
    setSelectedBarberForAccess({ id: barber.id, name: barber.name });
    setAccessDialogOpen(true);
  };

  const handleRemoveAccess = async (barberId: string) => {
    if (!confirm('Tem certeza que deseja remover o acesso deste barbeiro?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('barbers')
        .update({ user_id: null })
        .eq('id', barberId);

      if (error) throw error;

      toast({
        title: "Acesso removido",
        description: "O barbeiro não poderá mais fazer login."
      });

      onBarbersChange();
    } catch (error: any) {
      toast({
        title: "Erro ao remover acesso",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleConfirmEmail = async (barberId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://ppmiandwpebzsfqqhhws.supabase.co/functions/v1/confirm-barber-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            barberId,
            barbershopId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao confirmar email');
      }

      toast({
        title: "Email confirmado!",
        description: "O barbeiro agora pode fazer login."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao confirmar email",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New Professional Button */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Adicionar Profissional
          </CardTitle>
          <CardDescription>
            Cadastre um novo profissional na sua equipe com serviços e horários
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setCreateWizardOpen(true)} className="w-full sm:w-auto">
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Profissional
          </Button>
        </CardContent>
      </Card>

      {/* Barbers List */}
      <Card>
        <CardHeader>
          <CardTitle>Equipe ({barbers.length})</CardTitle>
          <CardDescription>
            Gerencie os profissionais da sua barbearia
          </CardDescription>
        </CardHeader>
        <CardContent>
          {barbers.length > 0 ? (
            <div className="space-y-4">
              {barbers.map((barber) => (
                <div key={barber.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      {barber.image_url ? (
                        <img
                          src={barber.image_url}
                          alt={barber.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h4 className="font-medium">{barber.name}</h4>
                        <Badge variant={barber.is_active ? "default" : "secondary"}>
                          {barber.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                        {barber.user_id ? (
                          <Badge variant="outline" className="gap-1 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200">
                            <KeyRound className="h-3 w-3" />
                            Tem acesso
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-muted-foreground">
                            <Key className="h-3 w-3" />
                            Sem acesso
                          </Badge>
                        )}
                      </div>
                      {barber.specialty && (
                        <p className="text-sm text-muted-foreground mb-1">{barber.specialty}</p>
                      )}
                      {barber.phone && (
                        <p className="text-sm text-muted-foreground">{barber.phone}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {!barber.user_id ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateAccess(barber)}
                        className="gap-1"
                      >
                        <Key className="h-4 w-4" />
                        Criar Acesso
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConfirmEmail(barber.id)}
                          className="gap-1 text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Confirmar Email
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveAccess(barber.id)}
                          className="gap-1 text-destructive hover:text-destructive"
                        >
                          <Key className="h-4 w-4" />
                          Remover Acesso
                        </Button>
                      </>
                    )}
                    <Switch
                      checked={barber.is_active}
                      onCheckedChange={() => handleToggleActive(barber.id, barber.is_active)}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setSelectedBarberForEdit(barber);
                        setEditDialogOpen(true);
                      }}
                      title="Configurar (Dados, Serviços, Horários)"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(barber.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum barbeiro cadastrado ainda</p>
              <p className="text-sm">Clique em "Novo Profissional" para adicionar</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Barber Wizard */}
      <CreateBarberWizard
        open={createWizardOpen}
        onOpenChange={setCreateWizardOpen}
        barbershopId={barbershopId}
        services={services}
        onBarberCreated={onBarbersChange}
      />

      {/* Create Access Dialog */}
      {selectedBarberForAccess && (
        <CreateBarberAccessDialog
          open={accessDialogOpen}
          onOpenChange={setAccessDialogOpen}
          barber={selectedBarberForAccess}
          barbershopId={barbershopId}
          onAccessCreated={onBarbersChange}
        />
      )}

      {/* Edit Barber Dialog */}
      {selectedBarberForEdit && (
        <EditBarberDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          barber={selectedBarberForEdit}
          onBarberUpdated={onBarbersChange}
        />
      )}
    </div>
  );
};

export default BarberForm;
