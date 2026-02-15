import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

interface BarberPermissionsPanelProps {
  barberId: string;
  barbershopId: string;
  barberName?: string;
}

export function BarberPermissionsPanel({ barberId, barbershopId, barberName }: BarberPermissionsPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [grantedPermissions, setGrantedPermissions] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'grant_all' | 'revoke_all' | null>(null);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cloneSourceId, setCloneSourceId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch other barbers for cloning
  const { data: otherBarbers = [] } = useQuery({
    queryKey: ['barbers-for-clone', barbershopId, barberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barbers')
        .select('id, name, user_id')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .neq('id', barberId)
        .order('name');
      if (error) throw error;
      return (data || []).filter(b => b.user_id);
    },
  });

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
    queryKey: ['barber-permissions-manage', barberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_permissions')
        .select('permission_id, granted')
        .eq('barber_id', barberId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!barberId,
  });

  useEffect(() => {
    if (currentPermissions) {
      const granted = new Set(
        currentPermissions.filter(p => p.granted).map(p => p.permission_id)
      );
      setGrantedPermissions(granted);
      setIsDirty(false);
    }
  }, [currentPermissions]);

  const togglePermission = (permissionId: string) => {
    setGrantedPermissions(prev => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
    setIsDirty(true);
  };

  const toggleModule = (module: PermissionModule) => {
    const modulePermIds = module.permissions.map(p => p.id);
    const allGranted = modulePermIds.every(id => grantedPermissions.has(id));
    setGrantedPermissions(prev => {
      const next = new Set(prev);
      modulePermIds.forEach(id => { allGranted ? next.delete(id) : next.add(id); });
      return next;
    });
    setIsDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('barber_permissions').delete().eq('barber_id', barberId);
      if (grantedPermissions.size > 0) {
        const rows = Array.from(grantedPermissions).map(permissionId => ({
          barber_id: barberId,
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
      queryClient.invalidateQueries({ queryKey: ['barber-permissions-manage', barberId] });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao salvar permissões', description: err.message, variant: 'destructive' });
    },
  });

  const grantAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('grant_all_permissions', {
        p_barber_id: barberId,
        p_granted_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Todas as permissões concedidas!' });
      queryClient.invalidateQueries({ queryKey: ['barber-permissions-manage', barberId] });
      queryClient.invalidateQueries({ queryKey: ['barber-permissions'] });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const revokeAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('revoke_all_permissions', {
        p_barber_id: barberId,
        p_granted_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Todas as permissões removidas!' });
      queryClient.invalidateQueries({ queryKey: ['barber-permissions-manage', barberId] });
      queryClient.invalidateQueries({ queryKey: ['barber-permissions'] });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const cloneMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('clone_barber_permissions', {
        p_source_barber_id: cloneSourceId,
        p_target_barber_id: barberId,
        p_granted_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Permissões clonadas com sucesso!' });
      setCloneDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['barber-permissions-manage', barberId] });
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

  if (loadingModules || loadingPermissions) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {grantedCount}/{totalPermissions} permissões ativas
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setConfirmAction('grant_all')}>
                <CheckCheck className="mr-2 h-4 w-4" /> Conceder Todas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfirmAction('revoke_all')}>
                <XCircle className="mr-2 h-4 w-4" /> Remover Todas
              </DropdownMenuItem>
              {otherBarbers.length > 0 && (
                <DropdownMenuItem onClick={() => setCloneDialogOpen(true)}>
                  <Copy className="mr-2 h-4 w-4" /> Copiar de Outro
                </DropdownMenuItem>
              )}
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
            className="pl-9 h-9"
          />
        </div>

        {/* Modules accordion */}
        <Accordion type="multiple" className="space-y-2">
          {filteredModules.map(module => {
            const modulePermIds = module.permissions.map(p => p.id);
            const grantedInModule = modulePermIds.filter(id => grantedPermissions.has(id)).length;
            const allGranted = modulePermIds.length > 0 && grantedInModule === modulePermIds.length;

            return (
              <AccordionItem key={module.id} value={module.id} className="border rounded-lg px-3">
                <AccordionTrigger className="hover:no-underline py-2.5 text-sm">
                  <div className="flex items-center gap-2 flex-1">
                    <span>{module.icon}</span>
                    <span className="font-medium">{module.name}</span>
                    <Badge
                      variant={allGranted ? 'default' : grantedInModule > 0 ? 'secondary' : 'outline'}
                      className="text-xs ml-auto mr-2"
                    >
                      {grantedInModule}/{modulePermIds.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                    <Checkbox
                      checked={allGranted}
                      onCheckedChange={() => toggleModule(module)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {allGranted ? 'Desmarcar todas' : 'Marcar todas'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {module.permissions.map(perm => (
                      <div key={perm.id} className="flex items-start gap-2">
                        <Checkbox
                          checked={grantedPermissions.has(perm.id)}
                          onCheckedChange={() => togglePermission(perm.id)}
                          className="mt-0.5"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-sm">{perm.name}</span>
                          {perm.description && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs text-xs">
                                {perm.description}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Save */}
        {isDirty && (
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="w-full"
          >
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar Permissões'}
          </Button>
        )}
      </div>

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
                : 'O barbeiro perderá acesso a todas as funcionalidades.'}
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
            <DialogTitle>Copiar Permissões</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Selecione o barbeiro de onde copiar as permissões:
          </p>
          <Select value={cloneSourceId} onValueChange={setCloneSourceId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um barbeiro" />
            </SelectTrigger>
            <SelectContent>
              {otherBarbers.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => cloneMutation.mutate()} disabled={!cloneSourceId || cloneMutation.isPending}>
              {cloneMutation.isPending ? 'Copiando...' : 'Copiar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
