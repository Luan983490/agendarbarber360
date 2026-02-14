import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, MoreVertical, Save, Copy, CheckCheck, XCircle, Info, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Permission {
  id: string;
  code: string;
  name: string;
  description: string;
}

interface PermissionModule {
  id: string;
  code: string;
  name: string;
  icon: string;
  description: string;
  display_order: number;
  permissions: Permission[];
}

interface Barber {
  id: string;
  name: string;
  is_active: boolean;
  user_id: string | null;
}

interface BarberPermissionsManagerProps {
  barbershopId: string;
}

export function BarberPermissionsManager({ barbershopId }: BarberPermissionsManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [grantedPermissions, setGrantedPermissions] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'grant_all' | 'revoke_all' | null>(null);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cloneSourceId, setCloneSourceId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch barbers
  const { data: barbers = [], isLoading: loadingBarbers } = useQuery({
    queryKey: ['barbers-for-permissions', barbershopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barbers')
        .select('id, name, is_active, user_id')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []) as Barber[];
    },
  });

  // Only barbers with user_id (can login)
  const loginBarbers = useMemo(() => barbers.filter(b => b.user_id), [barbers]);

  // Fetch modules and permissions
  const { data: modules = [], isLoading: loadingModules } = useQuery({
    queryKey: ['permission-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permission_modules')
        .select(`
          id, code, name, icon, description, display_order,
          permissions (id, code, name, description)
        `)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return (data || []) as PermissionModule[];
    },
  });

  // Fetch current barber's permissions
  const { data: currentPermissions, isLoading: loadingPermissions } = useQuery({
    queryKey: ['barber-permissions-manage', selectedBarberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_permissions')
        .select('permission_id, granted')
        .eq('barber_id', selectedBarberId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBarberId,
  });

  // Sync state when data loads
  useEffect(() => {
    if (currentPermissions) {
      const granted = new Set(
        currentPermissions.filter(p => p.granted).map(p => p.permission_id)
      );
      setGrantedPermissions(granted);
      setIsDirty(false);
    }
  }, [currentPermissions]);

  // Auto-select first barber
  useEffect(() => {
    if (loginBarbers.length > 0 && !selectedBarberId) {
      setSelectedBarberId(loginBarbers[0].id);
    }
  }, [loginBarbers, selectedBarberId]);

  const togglePermission = (permissionId: string) => {
    setGrantedPermissions(prev => {
      const next = new Set(prev);
      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }
      return next;
    });
    setIsDirty(true);
  };

  const toggleModule = (module: PermissionModule) => {
    const modulePermIds = module.permissions.map(p => p.id);
    const allGranted = modulePermIds.every(id => grantedPermissions.has(id));
    
    setGrantedPermissions(prev => {
      const next = new Set(prev);
      modulePermIds.forEach(id => {
        if (allGranted) {
          next.delete(id);
        } else {
          next.add(id);
        }
      });
      return next;
    });
    setIsDirty(true);
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Delete all existing
      await supabase
        .from('barber_permissions')
        .delete()
        .eq('barber_id', selectedBarberId);

      // Insert granted ones
      if (grantedPermissions.size > 0) {
        const rows = Array.from(grantedPermissions).map(permissionId => ({
          barber_id: selectedBarberId,
          permission_id: permissionId,
          granted: true,
          granted_by: user!.id,
        }));
        const { error } = await supabase.from('barber_permissions').insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Permissões salvas com sucesso!' });
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['barber-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['barber-permissions-manage', selectedBarberId] });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao salvar permissões', description: err.message, variant: 'destructive' });
    },
  });

  // Grant all
  const grantAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('grant_all_permissions', {
        p_barber_id: selectedBarberId,
        p_granted_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Todas as permissões concedidas!' });
      queryClient.invalidateQueries({ queryKey: ['barber-permissions-manage', selectedBarberId] });
      queryClient.invalidateQueries({ queryKey: ['barber-permissions'] });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  // Revoke all
  const revokeAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('revoke_all_permissions', {
        p_barber_id: selectedBarberId,
        p_granted_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Todas as permissões removidas!' });
      queryClient.invalidateQueries({ queryKey: ['barber-permissions-manage', selectedBarberId] });
      queryClient.invalidateQueries({ queryKey: ['barber-permissions'] });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  // Clone permissions
  const cloneMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('clone_barber_permissions', {
        p_source_barber_id: cloneSourceId,
        p_target_barber_id: selectedBarberId,
        p_granted_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Permissões clonadas com sucesso!' });
      setCloneDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['barber-permissions-manage', selectedBarberId] });
      queryClient.invalidateQueries({ queryKey: ['barber-permissions'] });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao clonar', description: err.message, variant: 'destructive' });
    },
  });

  const handleConfirmAction = () => {
    if (confirmAction === 'grant_all') grantAllMutation.mutate();
    if (confirmAction === 'revoke_all') revokeAllMutation.mutate();
    setConfirmAction(null);
  };

  const allPermissionIds = useMemo(() => modules.flatMap(m => m.permissions.map(p => p.id)), [modules]);
  const totalPermissions = allPermissionIds.length;
  const grantedCount = grantedPermissions.size;

  // Filter modules by search
  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return modules;
    const q = searchQuery.toLowerCase();
    return modules.map(m => ({
      ...m,
      permissions: m.permissions.filter(
        p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      ),
    })).filter(m => m.permissions.length > 0 || m.name.toLowerCase().includes(q));
  }, [modules, searchQuery]);

  const isLoading = loadingBarbers || loadingModules;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (loginBarbers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Nenhum barbeiro com acesso ao sistema</h3>
          <p className="text-muted-foreground text-sm">
            Para gerenciar permissões, primeiro crie um acesso para um barbeiro na aba de Barbeiros.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" />
                Permissões dos Barbeiros
              </CardTitle>
              <CardDescription className="mt-1">
                Controle o que cada barbeiro pode acessar no sistema
              </CardDescription>
            </div>
            {grantedCount > 0 && (
              <Badge variant="secondary" className="self-start">
                {grantedCount}/{totalPermissions} ativas
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Barber selector + actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedBarberId} onValueChange={(v) => { setSelectedBarberId(v); setIsDirty(false); }}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione um barbeiro" />
              </SelectTrigger>
              <SelectContent>
                {loginBarbers.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setConfirmAction('grant_all')}>
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Conceder Todas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConfirmAction('revoke_all')}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Remover Todas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCloneDialogOpen(true)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar de Outro Barbeiro
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar permissão..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Permission modules */}
          {loadingPermissions ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {filteredModules.map(module => {
                const modulePermIds = module.permissions.map(p => p.id);
                const grantedInModule = modulePermIds.filter(id => grantedPermissions.has(id)).length;
                const allGranted = modulePermIds.length > 0 && grantedInModule === modulePermIds.length;
                const someGranted = grantedInModule > 0 && !allGranted;

                return (
                  <AccordionItem key={module.id} value={module.id} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-lg">{module.icon}</span>
                        <span className="font-medium">{module.name}</span>
                        <Badge
                          variant={allGranted ? 'default' : someGranted ? 'secondary' : 'outline'}
                          className="text-xs ml-auto mr-2"
                        >
                          {grantedInModule}/{modulePermIds.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      {/* Module-level toggle */}
                      <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                        <Checkbox
                          checked={allGranted}
                          // @ts-ignore
                          indeterminate={someGranted}
                          onCheckedChange={() => toggleModule(module)}
                        />
                        <span className="text-sm font-medium text-muted-foreground">
                          {allGranted ? 'Desmarcar todas' : 'Marcar todas'}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {module.permissions.map(perm => (
                          <div key={perm.id} className="flex items-start gap-3">
                            <Checkbox
                              checked={grantedPermissions.has(perm.id)}
                              onCheckedChange={() => togglePermission(perm.id)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium">{perm.name}</span>
                                {perm.description && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-xs">
                                      {perm.description}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}

          {/* Save button */}
          {isDirty && (
            <div className="sticky bottom-0 pt-4 pb-2 bg-card border-t -mx-6 px-6">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="w-full"
              >
                <Save className="mr-2 h-4 w-4" />
                {saveMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'grant_all' ? 'Conceder Todas as Permissões?' : 'Remover Todas as Permissões?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'grant_all'
                ? 'O barbeiro terá acesso a todas as funcionalidades do sistema.'
                : 'O barbeiro perderá acesso a todas as funcionalidades. Esta ação pode ser revertida.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clone dialog */}
      <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copiar Permissões de Outro Barbeiro</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Copiar permissões de:</label>
            <Select value={cloneSourceId} onValueChange={setCloneSourceId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o barbeiro origem" />
              </SelectTrigger>
              <SelectContent>
                {loginBarbers
                  .filter(b => b.id !== selectedBarberId)
                  .map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => cloneMutation.mutate()}
              disabled={!cloneSourceId || cloneMutation.isPending}
            >
              {cloneMutation.isPending ? 'Clonando...' : 'Clonar Permissões'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
