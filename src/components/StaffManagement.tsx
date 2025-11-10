import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserPlus, Trash2, Users } from 'lucide-react';

interface StaffMember {
  id: string;
  user_id: string;
  role: 'barber' | 'attendant';
  email?: string;
  display_name?: string;
  created_at: string;
}

interface StaffManagementProps {
  barbershopId: string;
}

export function StaffManagement({ barbershopId }: StaffManagementProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: 'barber' as 'barber' | 'attendant',
    tempPassword: ''
  });

  useEffect(() => {
    fetchStaff();
  }, [barbershopId]);

  const fetchStaff = async () => {
    try {
      const { data: rolesData, error } = await supabase
        .from('user_roles')
        .select('id, user_id, role, created_at')
        .eq('barbershop_id', barbershopId)
        .in('role', ['barber', 'attendant']);

      if (error) throw error;

      if (rolesData && rolesData.length > 0) {
        const userIds = rolesData.map(r => r.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', userIds);

        const enrichedStaff = rolesData.map(role => ({
          ...role,
          display_name: profilesData?.find(p => p.user_id === role.user_id)?.display_name,
        })) as StaffMember[];

        setStaff(enrichedStaff);
      } else {
        setStaff([]);
      }
    } catch (error: any) {
      toast.error('Erro ao carregar funcionários');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!formData.email || !formData.tempPassword) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.tempPassword,
        options: {
          data: {
            user_type: formData.role,
            display_name: formData.email.split('@')[0]
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Usuário não criado');

      // Add role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          barbershop_id: barbershopId,
          role: formData.role
        });

      if (roleError) throw roleError;

      // If barber, create barber profile
      if (formData.role === 'barber') {
        const { error: barberError } = await supabase
          .from('barbers')
          .insert({
            user_id: authData.user.id,
            barbershop_id: barbershopId,
            name: formData.email.split('@')[0],
            is_active: true
          });

        if (barberError) throw barberError;
      }

      toast.success('Funcionário adicionado com sucesso!');
      setIsDialogOpen(false);
      setFormData({ email: '', role: 'barber', tempPassword: '' });
      fetchStaff();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar funcionário');
      console.error(error);
    }
  };

  const handleRemoveStaff = async (staffId: string, userId: string, role: string) => {
    if (!confirm('Tem certeza que deseja remover este funcionário?')) return;

    try {
      // Remove role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', staffId);

      if (roleError) throw roleError;

      // If barber, deactivate barber profile
      if (role === 'barber') {
        await supabase
          .from('barbers')
          .update({ is_active: false })
          .eq('user_id', userId);
      }

      toast.success('Funcionário removido com sucesso!');
      fetchStaff();
    } catch (error: any) {
      toast.error('Erro ao remover funcionário');
      console.error(error);
    }
  };

  const getRoleBadge = (role: string) => {
    return role === 'barber' ? (
      <Badge>Barbeiro</Badge>
    ) : (
      <Badge variant="secondary">Atendente</Badge>
    );
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Gerenciar Funcionários</h2>
        <p className="text-muted-foreground">
          Adicione barbeiros e atendentes à sua barbearia
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Funcionários
              </CardTitle>
              <CardDescription>
                Gerencie os acessos de barbeiros e atendentes
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar Funcionário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Funcionário</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>E-mail *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="funcionario@email.com"
                    />
                  </div>
                  <div>
                    <Label>Senha Temporária *</Label>
                    <Input
                      type="password"
                      value={formData.tempPassword}
                      onChange={(e) => setFormData({ ...formData, tempPassword: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      O funcionário deverá alterar a senha no primeiro acesso
                    </p>
                  </div>
                  <div>
                    <Label>Tipo de Acesso *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: 'barber' | 'attendant') => 
                        setFormData({ ...formData, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="barber">Barbeiro</SelectItem>
                        <SelectItem value="attendant">Atendente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddStaff}>
                    Adicionar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum funcionário cadastrado ainda</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Adicionado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.display_name || 'Sem nome'}
                    </TableCell>
                    <TableCell>{getRoleBadge(member.role)}</TableCell>
                    <TableCell>
                      {new Date(member.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveStaff(member.id, member.user_id, member.role)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
