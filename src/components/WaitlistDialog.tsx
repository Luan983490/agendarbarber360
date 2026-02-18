import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Pencil, X, Loader2, Search, Clock } from 'lucide-react';
import { AddToWaitlistDialog } from './AddToWaitlistDialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface WaitlistItem {
  id: string;
  client_name: string;
  client_phone: string | null;
  service_name: string | null;
  desired_date: string;
  description: string | null;
  status: string;
  contacted_at: string | null;
  created_at: string;
  barber_id: string | null;
}

interface WaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barbershopId: string;
  selectedDate: Date;
  barberId?: string;
}

export function WaitlistDialog({ open, onOpenChange, barbershopId, selectedDate, barberId }: WaitlistDialogProps) {
  const [items, setItems] = useState<WaitlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<WaitlistItem | null>(null);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const fetchItems = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      let query = supabase
        .from('waitlist')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('desired_date', dateStr)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      setItems((data as unknown as WaitlistItem[]) || []);
    } catch (err: any) {
      console.error('Erro ao buscar lista de espera:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchItems();
  }, [open, selectedDate]);

  const handleRemove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('waitlist')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Removido da lista de espera' });
      fetchItems();
    } catch (err: any) {
      toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' });
    }
  };

  const handleContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from('waitlist')
        .update({ status: 'contacted', contacted_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Marcado como contatado' });
      fetchItems();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const filteredItems = items.filter(item =>
    !search || item.client_name.toLowerCase().includes(search.toLowerCase()) ||
    item.client_phone?.includes(search) ||
    item.service_name?.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    switch (status) {
      case 'waiting': return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Aguardando</Badge>;
      case 'contacted': return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">Contatado</Badge>;
      case 'scheduled': return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">Agendado</Badge>;
      case 'cancelled': return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">Cancelado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Lista de Espera - {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Button
              onClick={() => { setEditItem(null); setAddOpen(true); }}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white gap-1"
            >
              <Plus className="h-4 w-4" />
              Adicionar na Lista de Espera
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum cliente na lista de espera para esta data.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Data de Cadastro</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Celular</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Alterar</TableHead>
                    <TableHead className="text-center">Remover</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-[150px] truncate">{item.description || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(item.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(item.desired_date + 'T00:00:00'), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>{item.client_name}</TableCell>
                      <TableCell>{item.client_phone || '-'}</TableCell>
                      <TableCell>{item.service_name || '-'}</TableCell>
                      <TableCell>{statusBadge(item.status)}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => { setEditItem(item); setAddOpen(true); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleRemove(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AddToWaitlistDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        barbershopId={barbershopId}
        selectedDate={selectedDate}
        barberId={barberId}
        editItem={editItem}
        onSuccess={() => { setAddOpen(false); fetchItems(); }}
      />
    </>
  );
}
