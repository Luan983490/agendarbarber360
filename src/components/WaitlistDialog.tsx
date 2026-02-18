import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Pencil, X, Loader2, Search, Clock } from 'lucide-react';
import { AddToWaitlistDialog } from './AddToWaitlistDialog';
import { Input } from '@/components/ui/input';

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

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

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'contacted') {
        updateData.contacted_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('waitlist')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
      toast({ title: `Status atualizado para ${statusLabel(newStatus)}` });
      fetchItems();
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar status', description: err.message, variant: 'destructive' });
    }
  };

  const openWhatsApp = (phone: string | null) => {
    if (!phone) {
      toast({ title: 'Telefone não informado', variant: 'destructive' });
      return;
    }
    const cleaned = phone.replace(/\D/g, '');
    const number = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
    window.open(`https://wa.me/${number}`, '_blank');
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'waiting': return 'Aguardando';
      case 'contacted': return 'Contatado';
      case 'scheduled': return 'Agendado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const filteredItems = items.filter(item =>
    !search || item.client_name.toLowerCase().includes(search.toLowerCase()) ||
    item.client_phone?.includes(search) ||
    item.service_name?.toLowerCase().includes(search.toLowerCase())
  );


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
                    <TableHead className="text-center">WhatsApp</TableHead>
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
                      <TableCell>
                        <Select
                          value={item.status}
                          onValueChange={(value) => handleStatusChange(item.id, value)}
                        >
                          <SelectTrigger className="h-8 w-[130px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="waiting">🟡 Aguardando</SelectItem>
                            <SelectItem value="contacted">🔵 Contatado</SelectItem>
                            <SelectItem value="scheduled">🟢 Agendado</SelectItem>
                            <SelectItem value="cancelled">🔴 Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                          onClick={() => openWhatsApp(item.client_phone)}
                          disabled={!item.client_phone}
                          title={item.client_phone ? 'Abrir WhatsApp' : 'Telefone não informado'}
                        >
                          <WhatsAppIcon className="h-4 w-4" />
                        </Button>
                      </TableCell>
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
