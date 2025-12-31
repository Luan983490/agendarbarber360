import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Plus, Edit, XCircle, CheckCircle, UserX } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditLog {
  booking_id: string;
  action: string;
  old_status: string | null;
  new_status: string | null;
  actor_role: string;
  origin: string;
  created_at: string;
  client_name: string;
  barber_name: string;
}

interface AuditTimelineCardProps {
  data: AuditLog[];
  loading: boolean;
}

export function AuditTimelineCard({ data, loading }: AuditTimelineCardProps) {
  const getActionIcon = (action: string, newStatus: string | null) => {
    if (action === 'insert') return <Plus className="h-4 w-4 text-green-600" />;
    if (action === 'cancel' || newStatus === 'cancelled') return <XCircle className="h-4 w-4 text-destructive" />;
    if (newStatus === 'completed') return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (newStatus === 'no_show') return <UserX className="h-4 w-4 text-orange-500" />;
    return <Edit className="h-4 w-4 text-blue-500" />;
  };

  const getActionLabel = (action: string, newStatus: string | null) => {
    if (action === 'insert') return 'Criado';
    if (action === 'cancel' || newStatus === 'cancelled') return 'Cancelado';
    if (newStatus === 'completed') return 'Finalizado';
    if (newStatus === 'confirmed') return 'Confirmado';
    if (newStatus === 'no_show') return 'No-Show';
    if (action === 'status_change') return 'Status alterado';
    return 'Alterado';
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge variant="default">Proprietário</Badge>;
      case 'barber':
        return <Badge variant="secondary">Barbeiro</Badge>;
      case 'attendant':
        return <Badge variant="outline">Atendente</Badge>;
      case 'client':
        return <Badge variant="outline">Cliente</Badge>;
      case 'system':
        return <Badge variant="secondary">Sistema</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getOriginLabel = (origin: string) => {
    switch (origin) {
      case 'admin':
        return 'Dashboard';
      case 'client':
        return 'App Cliente';
      case 'barber':
        return 'App Barbeiro';
      case 'system':
        return 'Sistema';
      default:
        return origin;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Auditoria de Agendamentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            Nenhuma atividade encontrada no período.
          </p>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {data.map((log, index) => (
                <div
                  key={`${log.booking_id}-${log.created_at}-${index}`}
                  className="flex gap-4 relative"
                >
                  {/* Timeline line */}
                  {index < data.length - 1 && (
                    <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-border" />
                  )}
                  
                  {/* Icon */}
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center z-10">
                    {getActionIcon(log.action, log.new_status)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-medium">
                        {getActionLabel(log.action, log.new_status)}
                      </span>
                      {getRoleBadge(log.actor_role)}
                      <span className="text-xs text-muted-foreground">
                        via {getOriginLabel(log.origin)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Cliente: <span className="text-foreground">{log.client_name}</span>
                      {log.barber_name !== 'N/A' && (
                        <> • Barbeiro: <span className="text-foreground">{log.barber_name}</span></>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
