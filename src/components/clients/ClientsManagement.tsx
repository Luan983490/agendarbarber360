import { useState } from 'react';
import { useClients, type ClientData } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Search,
  Plus,
  Download,
  Upload,
  Eye,
  Pencil,
  UserX,
  UserCheck,
  MoreHorizontal,
  Filter,
  X,
  Users,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import { ClientFormDialog } from './ClientFormDialog';
import { ClientDetailsDialog } from './ClientDetailsDialog';
import { ImportClientsDialog } from './ImportClientsDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

const AVAILABLE_TAGS = ['VIP', 'Regular', 'Premium', 'Inadimplente'];

interface ClientsManagementProps {
  barbershopId: string;
}

export function ClientsManagement({ barbershopId }: ClientsManagementProps) {
  const {
    clients,
    loading,
    search,
    setSearch,
    filters,
    setFilters,
    page,
    setPage,
    hasMore,
    getClientDetails,
    addClient,
    updateClient,
    toggleClientActive,
    importClients,
    exportClients,
  } = useClients(barbershopId);

  const isMobile = useIsMobile();
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [deactivateClient, setDeactivateClient] = useState<ClientData | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const formatPhone = (phone: string) => {
    const d = phone.replace(/\D/g, '');
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return phone;
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleSave = async (data: any) => {
    if (editingClient) {
      return updateClient(editingClient.id, data);
    }
    return addClient(data);
  };

  const openNew = () => {
    setEditingClient(null);
    setFormOpen(true);
  };

  const openEdit = (client: ClientData) => {
    setEditingClient(client);
    setFormOpen(true);
  };

  const openDetails = (clientId: string) => {
    setSelectedClientId(clientId);
    setDetailsOpen(true);
  };

  const toggleTag = (tag: string) => {
    const current = filters.tags || [];
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    setFilters({ ...filters, tags: next.length > 0 ? next : null });
  };

  const activeFilterCount =
    (filters.tags?.length || 0) + (filters.includeInactive ? 1 : 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Gestão de Clientes
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie os clientes da sua barbearia
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Importar</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportClients()}>
            <Download className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone ou email..."
            className="pl-9"
          />
        </div>
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-1" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge
                  variant="default"
                  className="ml-1.5 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="end">
            <div className="space-y-3">
              <p className="text-sm font-medium">Filtrar por tags</p>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_TAGS.map((tag) => (
                  <Badge
                    key={tag}
                    variant={filters.tags?.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer select-none text-xs"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-inactive"
                  checked={filters.includeInactive}
                  onCheckedChange={(checked) =>
                    setFilters({ ...filters, includeInactive: !!checked })
                  }
                />
                <label htmlFor="include-inactive" className="text-sm cursor-pointer">
                  Incluir inativos
                </label>
              </div>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setFilters({ tags: null, includeInactive: false })}
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar filtros
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active filters display */}
      {filters.tags && filters.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-muted-foreground">Filtros ativos:</span>
          {filters.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="cursor-pointer text-xs"
              onClick={() => toggleTag(tag)}
            >
              {tag}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-1">Nenhum cliente encontrado</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search
              ? 'Tente buscar com outros termos'
              : 'Comece adicionando seus clientes'}
          </p>
          {!search && (
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Cliente
            </Button>
          )}
        </div>
      ) : isMobile ? (
        /* Mobile cards */
        <div className="space-y-3">
          {clients.map((client) => (
            <div
              key={client.id}
              className="border border-border rounded-lg p-3 space-y-2"
              onClick={() => openDetails(client.id)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{client.client_name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {client.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                    {!client.is_active && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        Inativo
                      </Badge>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetails(client.id); }}>
                      <Eye className="h-4 w-4 mr-2" /> Ver Detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(client); }}>
                      <Pencil className="h-4 w-4 mr-2" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); setDeactivateClient(client); }}
                      className={client.is_active ? 'text-destructive' : ''}
                    >
                      {client.is_active ? (
                        <><UserX className="h-4 w-4 mr-2" /> Desativar</>
                      ) : (
                        <><UserCheck className="h-4 w-4 mr-2" /> Reativar</>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <a
                  href={`https://wa.me/55${client.client_phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MessageCircle className="h-3 w-3" />
                  {formatPhone(client.client_phone)}
                </a>
                <span>{client.total_bookings} agend. • {formatCurrency(client.total_spent)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Desktop table */
        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Cliente</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Agendamentos</TableHead>
                <TableHead className="text-right">Gasto Total</TableHead>
                <TableHead className="text-right">Última Visita</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id} className="cursor-pointer" onClick={() => openDetails(client.id)}>
                  <TableCell>
                    <div>
                      <p className="font-medium flex items-center gap-1.5">
                        {client.client_name}
                        {!client.is_active && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0">
                            Inativo
                          </Badge>
                        )}
                      </p>
                      {client.tags && client.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {client.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <a
                      href={`https://wa.me/55${client.client_phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MessageCircle className="h-3 w-3" />
                      {formatPhone(client.client_phone)}
                    </a>
                  </TableCell>
                  <TableCell className="text-sm">{client.client_email}</TableCell>
                  <TableCell className="text-center">{client.total_bookings}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(client.total_spent)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {client.last_booking_date
                      ? new Date(client.last_booking_date).toLocaleDateString('pt-BR')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetails(client.id); }}>
                          <Eye className="h-4 w-4 mr-2" /> Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(client); }}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); setDeactivateClient(client); }}
                          className={client.is_active ? 'text-destructive' : ''}
                        >
                          {client.is_active ? (
                            <><UserX className="h-4 w-4 mr-2" /> Desativar</>
                          ) : (
                            <><UserCheck className="h-4 w-4 mr-2" /> Reativar</>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {clients.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore}
              onClick={() => setPage(page + 1)}
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ClientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        client={editingClient}
        onSave={handleSave}
      />

      <ClientDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        clientId={selectedClientId}
        onLoadDetails={getClientDetails}
        onEdit={() => {
          setDetailsOpen(false);
          const client = clients.find((c) => c.id === selectedClientId);
          if (client) openEdit(client);
        }}
      />

      <ImportClientsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={importClients}
      />

      {/* Deactivate confirmation */}
      <AlertDialog
        open={!!deactivateClient}
        onOpenChange={(open) => !open && setDeactivateClient(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deactivateClient?.is_active ? 'Desativar Cliente' : 'Reativar Cliente'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateClient?.is_active
                ? `Deseja desativar "${deactivateClient?.client_name}"? O cliente não será excluído, apenas marcado como inativo.`
                : `Deseja reativar "${deactivateClient?.client_name}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deactivateClient) {
                  toggleClientActive(deactivateClient.id, deactivateClient.is_active);
                  setDeactivateClient(null);
                }
              }}
            >
              {deactivateClient?.is_active ? 'Desativar' : 'Reativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
