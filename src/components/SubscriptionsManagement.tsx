/*
====================================
FEATURE TEMPORARIAMENTE DESATIVADA
====================================
Versão: v2.0 (pós-validação MVP)
Data desativação: 15/12/2024
Reativar quando: Após validar MVP com 10+ barbearias
Feature: Assinaturas (Planos Recorrentes)
====================================
*/

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CreditCard, Users, TrendingUp, Calendar, Plus, Edit, Trash2, Tag } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientSubscription {
  id: string;
  client_id: string;
  plan_name: string;
  plan_description: string | null;
  price_monthly: number;
  status: string;
  start_date: string;
  next_billing_date: string;
  profiles?: {
    display_name: string;
    phone: string;
  };
}

interface SubscriptionPlan {
  id: string;
  plan_name: string;
  description: string | null;
  price_monthly: number;
  benefits: any;
  is_active: boolean;
}

interface SubscriptionsManagementProps {
  barbershopId: string;
}

export const SubscriptionsManagement = ({ barbershopId }: SubscriptionsManagementProps) => {
  const [subscriptions, setSubscriptions] = useState<ClientSubscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
  });
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [planForm, setPlanForm] = useState({
    plan_name: '',
    description: '',
    price_monthly: 0,
    benefits: [] as string[],
    is_active: true
  });
  const [benefitInput, setBenefitInput] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [barbershopId]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchSubscriptions(), fetchPlans()]);
    setLoading(false);
  };

  const fetchSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('client_subscriptions')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const clientIds = data.map(s => s.client_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, display_name, phone')
          .in('user_id', clientIds);

        const subscriptionsWithProfiles = data.map(sub => ({
          ...sub,
          profiles: profilesData?.find(p => p.user_id === sub.client_id),
        }));

        setSubscriptions(subscriptionsWithProfiles as any);

        const total = data?.length || 0;
        const active = data?.filter(s => s.status === 'active').length || 0;
        const revenue = data
          ?.filter(s => s.status === 'active')
          .reduce((sum, s) => sum + Number(s.price_monthly), 0) || 0;

        setStats({
          totalSubscriptions: total,
          activeSubscriptions: active,
          monthlyRevenue: revenue,
        });
      } else {
        setSubscriptions([]);
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar assinaturas',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar planos',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSavePlan = async () => {
    if (!planForm.plan_name || planForm.price_monthly <= 0) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    try {
      const planData = {
        ...planForm,
        barbershop_id: barbershopId,
        benefits: planForm.benefits.length > 0 ? planForm.benefits : null
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('subscription_plans')
          .update(planData)
          .eq('id', editingPlan.id);

        if (error) throw error;
        toast({ title: 'Plano atualizado com sucesso!' });
      } else {
        const { error } = await supabase
          .from('subscription_plans')
          .insert(planData);

        if (error) throw error;
        toast({ title: 'Plano criado com sucesso!' });
      }

      setIsPlanDialogOpen(false);
      setEditingPlan(null);
      setPlanForm({
        plan_name: '',
        description: '',
        price_monthly: 0,
        benefits: [],
        is_active: true
      });
      fetchPlans();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar plano',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Plano excluído com sucesso!' });
      fetchPlans();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir plano',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openPlanDialog = (plan?: SubscriptionPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        plan_name: plan.plan_name,
        description: plan.description || '',
        price_monthly: Number(plan.price_monthly),
        benefits: Array.isArray(plan.benefits) ? plan.benefits : [],
        is_active: plan.is_active
      });
    } else {
      setEditingPlan(null);
      setPlanForm({
        plan_name: '',
        description: '',
        price_monthly: 0,
        benefits: [],
        is_active: true
      });
    }
    setIsPlanDialogOpen(true);
  };

  const addBenefit = () => {
    if (benefitInput.trim()) {
      setPlanForm({
        ...planForm,
        benefits: [...planForm.benefits, benefitInput.trim()]
      });
      setBenefitInput('');
    }
  };

  const removeBenefit = (index: number) => {
    setPlanForm({
      ...planForm,
      benefits: planForm.benefits.filter((_, i) => i !== index)
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      active: { variant: 'default', label: 'Ativa' },
      cancelled: { variant: 'destructive', label: 'Cancelada' },
      suspended: { variant: 'secondary', label: 'Suspensa' },
    };

    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <CreditCard className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Gerenciar Assinaturas</h2>
        <p className="text-muted-foreground">
          Crie planos e acompanhe as assinaturas dos seus clientes
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Assinaturas
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubscriptions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Assinaturas Ativas
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Receita Mensal Recorrente
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.monthlyRevenue.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans" className="gap-2">
            <Tag className="h-4 w-4" />
            Planos
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Assinaturas de Clientes
          </TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Planos de Assinatura</CardTitle>
                  <CardDescription>
                    Gerencie os planos disponíveis para seus clientes
                  </CardDescription>
                </div>
                <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => openPlanDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Plano
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingPlan ? 'Editar Plano' : 'Novo Plano'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nome do Plano *</Label>
                        <Input
                          value={planForm.plan_name}
                          onChange={(e) => setPlanForm({ ...planForm, plan_name: e.target.value })}
                          placeholder="Ex: Plano Premium"
                        />
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea
                          value={planForm.description}
                          onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                          placeholder="Descreva os detalhes do plano"
                        />
                      </div>
                      <div>
                        <Label>Valor Mensal (R$) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={planForm.price_monthly}
                          onChange={(e) => setPlanForm({ ...planForm, price_monthly: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label>Benefícios</Label>
                        <div className="flex gap-2 mb-2">
                          <Input
                            value={benefitInput}
                            onChange={(e) => setBenefitInput(e.target.value)}
                            placeholder="Adicione um benefício"
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                          />
                          <Button type="button" onClick={addBenefit}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {planForm.benefits.map((benefit, index) => (
                            <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                              <span className="text-sm">{benefit}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeBenefit(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Plano Ativo</Label>
                        <Switch
                          checked={planForm.is_active}
                          onCheckedChange={(checked) => setPlanForm({ ...planForm, is_active: checked })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsPlanDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleSavePlan}>
                        Salvar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {plans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum plano cadastrado ainda</p>
                  <p className="text-sm">Crie planos de assinatura para seus clientes</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Benefícios</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{plan.plan_name}</div>
                            {plan.description && (
                              <div className="text-sm text-muted-foreground">{plan.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          R$ {Number(plan.price_monthly).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {Array.isArray(plan.benefits) && plan.benefits.length > 0 ? (
                            <div className="text-sm">
                              {plan.benefits.slice(0, 2).join(', ')}
                              {plan.benefits.length > 2 && ` +${plan.benefits.length - 2}`}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {plan.is_active ? (
                            <Badge variant="default">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openPlanDialog(plan)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePlan(plan.id)}
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

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Assinaturas de Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma assinatura cadastrada ainda.</p>
                  <p className="text-sm">
                    As assinaturas serão criadas quando os clientes contratarem planos.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Valor Mensal</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Início</TableHead>
                        <TableHead>Próxima Cobrança</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptions.map((subscription) => (
                        <TableRow key={subscription.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {subscription.profiles?.display_name || 'Cliente'}
                              </p>
                              {subscription.profiles?.phone && (
                                <p className="text-sm text-muted-foreground">
                                  {subscription.profiles.phone}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{subscription.plan_name}</p>
                              {subscription.plan_description && (
                                <p className="text-sm text-muted-foreground">
                                  {subscription.plan_description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            R$ {Number(subscription.price_monthly).toFixed(2)}
                          </TableCell>
                          <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                          <TableCell>
                            {format(new Date(subscription.start_date), 'dd/MM/yyyy', {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {format(
                                new Date(subscription.next_billing_date),
                                'dd/MM/yyyy',
                                { locale: ptBR }
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
