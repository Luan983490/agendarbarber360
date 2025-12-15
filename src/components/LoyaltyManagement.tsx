/*
====================================
FEATURE TEMPORARIAMENTE DESATIVADA
====================================
Versão: v2.0 (pós-validação MVP)
Data desativação: 15/12/2024
Reativar quando: Após validar MVP com 10+ barbearias
Feature: Fidelidade (Programa de Pontos)
====================================
*/

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Gift, Settings, Users, Plus, Edit, Trash2, Award } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface LoyaltySettings {
  id: string;
  points_per_real: number;
  is_active: boolean;
}

interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  points_required: number;
  is_active: boolean;
}

interface ClientPoints {
  id: string;
  client_id: string;
  points_balance: number;
  total_points_earned: number;
  client_name?: string;
  client_phone?: string;
}

export function LoyaltyManagement() {
  const { user } = useAuth();
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [clientPoints, setClientPoints] = useState<ClientPoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null);
  const [isRewardDialogOpen, setIsRewardDialogOpen] = useState(false);

  // Form states
  const [rewardForm, setRewardForm] = useState({
    name: '',
    description: '',
    points_required: 0,
    is_active: true
  });

  useEffect(() => {
    if (user) {
      fetchBarbershop();
    }
  }, [user]);

  useEffect(() => {
    if (barbershopId) {
      fetchLoyaltyData();
    }
  }, [barbershopId]);

  const fetchBarbershop = async () => {
    const { data, error } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user?.id)
      .single();

    if (error) {
      toast.error('Erro ao carregar barbearia');
      return;
    }

    setBarbershopId(data.id);
  };

  const fetchLoyaltyData = async () => {
    setLoading(true);
    await Promise.all([
      fetchSettings(),
      fetchRewards(),
      fetchClientPoints()
    ]);
    setLoading(false);
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('loyalty_settings')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .single();

    if (error && error.code !== 'PGRST116') {
      toast.error('Erro ao carregar configurações');
      return;
    }

    setSettings(data || null);
  };

  const fetchRewards = async () => {
    const { data, error } = await supabase
      .from('loyalty_rewards')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('points_required', { ascending: true });

    if (error) {
      toast.error('Erro ao carregar recompensas');
      return;
    }

    setRewards(data || []);
  };

  const fetchClientPoints = async () => {
    const { data, error } = await supabase
      .from('client_loyalty_points')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('points_balance', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar pontos dos clientes');
      return;
    }

    // Fetch client profiles
    if (data && data.length > 0) {
      const clientIds = data.map(cp => cp.client_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, phone')
        .in('user_id', clientIds);

      const enrichedData = data.map(cp => {
        const profile = profiles?.find(p => p.user_id === cp.client_id);
        return {
          ...cp,
          client_name: profile?.display_name || 'Cliente',
          client_phone: profile?.phone || '-'
        };
      });

      setClientPoints(enrichedData);
    } else {
      setClientPoints([]);
    }
  };

  const saveSettings = async (pointsPerReal: number, isActive: boolean) => {
    if (!barbershopId) return;

    if (settings) {
      const { error } = await supabase
        .from('loyalty_settings')
        .update({ points_per_real: pointsPerReal, is_active: isActive })
        .eq('id', settings.id);

      if (error) {
        toast.error('Erro ao atualizar configurações');
        return;
      }
    } else {
      const { error } = await supabase
        .from('loyalty_settings')
        .insert({ barbershop_id: barbershopId, points_per_real: pointsPerReal, is_active: isActive });

      if (error) {
        toast.error('Erro ao criar configurações');
        return;
      }
    }

    toast.success('Configurações salvas com sucesso!');
    fetchSettings();
  };

  const handleSaveReward = async () => {
    if (!barbershopId) return;

    if (editingReward) {
      const { error } = await supabase
        .from('loyalty_rewards')
        .update(rewardForm)
        .eq('id', editingReward.id);

      if (error) {
        toast.error('Erro ao atualizar recompensa');
        return;
      }

      toast.success('Recompensa atualizada!');
    } else {
      const { error } = await supabase
        .from('loyalty_rewards')
        .insert({ ...rewardForm, barbershop_id: barbershopId });

      if (error) {
        toast.error('Erro ao criar recompensa');
        return;
      }

      toast.success('Recompensa criada!');
    }

    setIsRewardDialogOpen(false);
    setEditingReward(null);
    setRewardForm({ name: '', description: '', points_required: 0, is_active: true });
    fetchRewards();
  };

  const handleDeleteReward = async (id: string) => {
    const { error } = await supabase
      .from('loyalty_rewards')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir recompensa');
      return;
    }

    toast.success('Recompensa excluída!');
    fetchRewards();
  };

  const openRewardDialog = (reward?: LoyaltyReward) => {
    if (reward) {
      setEditingReward(reward);
      setRewardForm({
        name: reward.name,
        description: reward.description || '',
        points_required: reward.points_required,
        is_active: reward.is_active
      });
    } else {
      setEditingReward(null);
      setRewardForm({ name: '', description: '', points_required: 0, is_active: true });
    }
    setIsRewardDialogOpen(true);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Programa de Fidelidade</h2>
          <p className="text-muted-foreground">Gerencie pontos e recompensas para seus clientes</p>
        </div>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="rewards" className="gap-2">
            <Gift className="h-4 w-4" />
            Recompensas
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-2">
            <Users className="h-4 w-4" />
            Clientes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Programa</CardTitle>
              <CardDescription>
                Configure como os clientes ganham pontos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Pontos por Real Gasto</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={settings?.points_per_real || 1}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (settings) {
                      setSettings({ ...settings, points_per_real: value });
                    }
                  }}
                />
                <p className="text-sm text-muted-foreground">
                  Ex: 1 ponto = R$ 1,00 gasto
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Programa Ativo</Label>
                  <p className="text-sm text-muted-foreground">
                    Ative ou desative o programa de fidelidade
                  </p>
                </div>
                <Switch
                  checked={settings?.is_active || false}
                  onCheckedChange={(checked) => {
                    if (settings) {
                      setSettings({ ...settings, is_active: checked });
                    }
                  }}
                />
              </div>

              <Button 
                onClick={() => saveSettings(settings?.points_per_real || 1, settings?.is_active || false)}
              >
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recompensas</CardTitle>
                  <CardDescription>
                    Gerencie as recompensas disponíveis para os clientes
                  </CardDescription>
                </div>
                <Dialog open={isRewardDialogOpen} onOpenChange={setIsRewardDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => openRewardDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Recompensa
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingReward ? 'Editar Recompensa' : 'Nova Recompensa'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nome</Label>
                        <Input
                          value={rewardForm.name}
                          onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea
                          value={rewardForm.description}
                          onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Pontos Necessários</Label>
                        <Input
                          type="number"
                          value={rewardForm.points_required}
                          onChange={(e) => setRewardForm({ ...rewardForm, points_required: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Ativa</Label>
                        <Switch
                          checked={rewardForm.is_active}
                          onCheckedChange={(checked) => setRewardForm({ ...rewardForm, is_active: checked })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsRewardDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveReward}>
                        Salvar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {rewards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma recompensa cadastrada ainda</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Pontos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rewards.map((reward) => (
                      <TableRow key={reward.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{reward.name}</div>
                            {reward.description && (
                              <div className="text-sm text-muted-foreground">{reward.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{reward.points_required} pts</TableCell>
                        <TableCell>
                          {reward.is_active ? (
                            <span className="text-green-600">Ativa</span>
                          ) : (
                            <span className="text-muted-foreground">Inativa</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openRewardDialog(reward)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteReward(reward.id)}
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
        </TabsContent>

        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle>Pontos dos Clientes</CardTitle>
              <CardDescription>
                Visualize os pontos acumulados pelos clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clientPoints.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum cliente com pontos ainda</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Saldo</TableHead>
                      <TableHead>Total Ganho</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientPoints.map((cp) => (
                      <TableRow key={cp.id}>
                        <TableCell className="font-medium">{cp.client_name}</TableCell>
                        <TableCell>{cp.client_phone}</TableCell>
                        <TableCell>
                          <span className="font-semibold text-primary">{cp.points_balance} pts</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {cp.total_points_earned} pts
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
