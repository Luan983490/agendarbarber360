import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2, Plus, User, Key, KeyRound, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from './ImageUpload';
import { CreateBarberAccessDialog } from './CreateBarberAccessDialog';

interface Barber {
  id: string;
  name: string;
  specialty?: string;
  phone?: string;
  image_url?: string;
  is_active: boolean;
  user_id?: string | null;
}

interface BarberFormProps {
  barbershopId: string;
  barbers: Barber[];
  onBarbersChange: () => void;
}

const BarberForm = ({ barbershopId, barbers, onBarbersChange }: BarberFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    phone: '',
    image_url: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [selectedBarberForAccess, setSelectedBarberForAccess] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome do barbeiro é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      if (editingId) {
        // Update existing barber
        const { error } = await supabase
          .from('barbers')
          .update({
            name: formData.name,
            specialty: formData.specialty || null,
            phone: formData.phone || null
          })
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: "Barbeiro atualizado!",
          description: "As informações foram salvas com sucesso."
        });
      } else {
        // Create new barber
        const { error } = await supabase
          .from('barbers')
          .insert({
            barbershop_id: barbershopId,
            name: formData.name,
            specialty: formData.specialty || null,
            phone: formData.phone || null,
            is_active: true
          });

        if (error) throw error;

        toast({
          title: "Barbeiro adicionado!",
          description: "Novo profissional cadastrado com sucesso."
        });
      }

      // Reset form
      setFormData({ name: '', specialty: '', phone: '', image_url: '' });
      setEditingId(null);
      onBarbersChange();

    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (barber: Barber) => {
    setFormData({
      name: barber.name,
      specialty: barber.specialty || '',
      phone: barber.phone || '',
      image_url: barber.image_url || ''
    });
    setEditingId(barber.id);
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
    if (!confirm('Tem certeza que deseja remover o acesso deste barbeiro? Ele não poderá mais fazer login.')) {
      return;
    }

    try {
      // Just remove the user_id from the barber record
      // We don't delete the auth user to keep data integrity
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

  const cancelEdit = () => {
    setFormData({ name: '', specialty: '', phone: '', image_url: '' });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Add/Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {editingId ? 'Editar Barbeiro' : 'Adicionar Barbeiro'}
          </CardTitle>
          <CardDescription>
            {editingId ? 'Atualize as informações do profissional' : 'Cadastre um novo profissional na sua equipe'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome completo do barbeiro"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="specialty">Especialidade</Label>
              <Textarea
                id="specialty"
                value={formData.specialty}
                onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value }))}
                placeholder="Ex: Especialista em cortes clássicos, Expert em barbas..."
                rows={2}
              />
             </div>

            <div className="space-y-2">
              <Label>Foto do Barbeiro</Label>
              <ImageUpload
                currentImageUrl={formData.image_url}
                onImageUploaded={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                bucket="barber-images"
                folder="profile"
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                {loading ? 'Salvando...' : editingId ? 'Atualizar' : 'Adicionar'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
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
                      onClick={() => handleEdit(barber)}
                    >
                      <Edit2 className="h-4 w-4" />
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
              <p className="text-sm">Adicione profissionais à sua equipe para que os clientes possam escolher</p>
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
};

export default BarberForm;
