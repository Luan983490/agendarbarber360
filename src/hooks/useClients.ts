import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';

export interface ClientData {
  id: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  client_notes: string | null;
  tags: string[];
  is_active: boolean;
  client_profile_id: string | null;
  source: string;
  created_at: string;
  total_bookings: number;
  total_spent: number;
  last_booking_date: string | null;
}

export interface ClientDetails extends ClientData {
  updated_at: string;
  first_booking_date: string | null;
  favorite_barber_name: string | null;
  recent_bookings: {
    id: string;
    date: string;
    time: string;
    status: string;
    total_price: number;
    barber_name: string;
    service_name: string;
  }[];
}

export interface ClientFilters {
  tags: string[] | null;
  includeInactive: boolean;
}

export function useClients(barbershopId: string | undefined) {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [filters, setFilters] = useState<ClientFilters>({
    tags: null,
    includeInactive: false,
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();
  const limit = 50;

  const loadClients = useCallback(async () => {
    if (!barbershopId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('list_clients', {
        p_barbershop_id: barbershopId,
        p_search: debouncedSearch || null,
        p_include_inactive: filters.includeInactive,
        p_tags: filters.tags,
        p_limit: limit,
        p_offset: (page - 1) * limit,
      });

      if (error) throw error;
      const result = (data as unknown as ClientData[]) || [];
      setClients(result);
      setHasMore(result.length === limit);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar clientes',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [barbershopId, debouncedSearch, filters, page, toast]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Reset page when search/filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const getClientDetails = useCallback(
    async (clientId: string): Promise<ClientDetails | null> => {
      if (!barbershopId) return null;
      try {
        const { data, error } = await supabase.rpc('get_client_details', {
          p_barbershop_id: barbershopId,
          p_client_id: clientId,
        });
        if (error) throw error;
        return data as unknown as ClientDetails;
      } catch (error: any) {
        toast({
          title: 'Erro ao carregar detalhes',
          description: error.message,
          variant: 'destructive',
        });
        return null;
      }
    },
    [barbershopId, toast]
  );

  const addClient = useCallback(
    async (clientData: {
      client_name: string;
      client_phone: string;
      client_email: string;
      client_notes?: string;
      tags?: string[];
    }) => {
      if (!barbershopId) return false;
      try {
        const { error } = await supabase.from('barbershop_clients').insert({
          barbershop_id: barbershopId,
          client_name: clientData.client_name,
          client_phone: clientData.client_phone,
          client_email: clientData.client_email,
          client_notes: clientData.client_notes || null,
          tags: clientData.tags || [],
          source: 'manual',
        });
        if (error) throw error;
        toast({ title: 'Cliente adicionado com sucesso!' });
        loadClients();
        return true;
      } catch (error: any) {
        toast({
          title: 'Erro ao adicionar cliente',
          description: error.message,
          variant: 'destructive',
        });
        return false;
      }
    },
    [barbershopId, loadClients, toast]
  );

  const updateClient = useCallback(
    async (
      clientId: string,
      clientData: {
        client_name?: string;
        client_phone?: string;
        client_email?: string;
        client_notes?: string | null;
        tags?: string[];
      }
    ) => {
      try {
        const { error } = await supabase
          .from('barbershop_clients')
          .update(clientData)
          .eq('id', clientId);
        if (error) throw error;
        toast({ title: 'Cliente atualizado com sucesso!' });
        loadClients();
        return true;
      } catch (error: any) {
        toast({
          title: 'Erro ao atualizar cliente',
          description: error.message,
          variant: 'destructive',
        });
        return false;
      }
    },
    [loadClients, toast]
  );

  const toggleClientActive = useCallback(
    async (clientId: string, isActive: boolean) => {
      try {
        const { error } = await supabase
          .from('barbershop_clients')
          .update({ is_active: !isActive })
          .eq('id', clientId);
        if (error) throw error;
        toast({
          title: isActive ? 'Cliente desativado' : 'Cliente reativado',
        });
        loadClients();
        return true;
      } catch (error: any) {
        toast({
          title: 'Erro ao alterar status',
          description: error.message,
          variant: 'destructive',
        });
        return false;
      }
    },
    [loadClients, toast]
  );

  const importClients = useCallback(
    async (
      clientsList: {
        name: string;
        phone: string;
        email: string;
        notes?: string | null;
        tags?: string[];
        line_number: number;
      }[]
    ) => {
      if (!barbershopId) return null;
      try {
        const { data, error } = await supabase.rpc('import_clients', {
          p_barbershop_id: barbershopId,
          p_clients: clientsList as any,
        });
        if (error) throw error;
        loadClients();
        return data as any;
      } catch (error: any) {
        toast({
          title: 'Erro ao importar clientes',
          description: error.message,
          variant: 'destructive',
        });
        return null;
      }
    },
    [barbershopId, loadClients, toast]
  );

  const exportClients = useCallback(
    async (exportFilters?: { includeInactive?: boolean; tags?: string[] | null }) => {
      if (!barbershopId) return;
      try {
        const { data, error } = await supabase.rpc('get_clients_for_export', {
          p_barbershop_id: barbershopId,
          p_include_inactive: exportFilters?.includeInactive ?? false,
          p_tags: exportFilters?.tags ?? null,
        });
        if (error) throw error;

        const rows = data as unknown as Record<string, any>[];
        if (!rows || rows.length === 0) {
          toast({ title: 'Nenhum cliente para exportar', variant: 'destructive' });
          return;
        }

        const headers = Object.keys(rows[0]);
        const csvContent = [
          headers.join(','),
          ...rows.map((row) =>
            headers
              .map((header) => {
                const value = row[header] || '';
                return `"${String(value).replace(/"/g, '""')}"`;
              })
              .join(',')
          ),
        ].join('\n');

        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], {
          type: 'text/csv;charset=utf-8;',
        });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);

        toast({ title: 'Clientes exportados com sucesso!' });
      } catch (error: any) {
        toast({
          title: 'Erro ao exportar clientes',
          description: error.message,
          variant: 'destructive',
        });
      }
    },
    [barbershopId, toast]
  );

  return {
    clients,
    loading,
    search,
    setSearch,
    filters,
    setFilters,
    page,
    setPage,
    hasMore,
    loadClients,
    getClientDetails,
    addClient,
    updateClient,
    toggleClientActive,
    importClients,
    exportClients,
  };
}
