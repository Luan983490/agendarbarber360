import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, TrendingDown, UserX, XCircle, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Alert {
  id: string;
  alert_type: string;
  threshold: number;
  current_value: number;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function AlertsCard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase.rpc('get_active_alerts');
      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'high_cancellation':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'no_show_spike':
        return <UserX className="h-4 w-4 text-orange-500" />;
      case 'revenue_drop':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getAlertBadge = (type: string) => {
    switch (type) {
      case 'high_cancellation':
        return <Badge variant="destructive">Cancelamentos</Badge>;
      case 'no_show_spike':
        return <Badge className="bg-orange-500">No-Show</Badge>;
      case 'revenue_drop':
        return <Badge variant="destructive">Faturamento</Badge>;
      default:
        return <Badge variant="secondary">Alerta</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    );
  }

  const unreadAlerts = alerts.filter(a => !a.is_read);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Alertas
          {unreadAlerts.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadAlerts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            Nenhum alerta nos últimos 30 dias.
          </p>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  alert.is_read ? 'bg-muted/30' : 'bg-destructive/5 border-destructive/20'
                }`}
              >
                {getAlertIcon(alert.alert_type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getAlertBadge(alert.alert_type)}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(alert.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
