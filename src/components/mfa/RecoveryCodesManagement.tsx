import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Key, RefreshCw, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateRecoveryCodes } from '@/lib/recovery-codes';
import { RecoveryCodesDisplay } from './RecoveryCodesDisplay';

interface RecoveryCodesManagementProps {
  userId: string;
  isMFAEnabled: boolean;
}

export const RecoveryCodesManagement = ({ userId, isMFAEnabled }: RecoveryCodesManagementProps) => {
  const [unusedCount, setUnusedCount] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [showNewCodes, setShowNewCodes] = useState(false);
  const [newCodes, setNewCodes] = useState<string[]>([]);
  const { toast } = useToast();

  const fetchCodeStatus = async () => {
    try {
      setLoading(true);
      
      // Get all codes for user
      const { data, error } = await supabase
        .from('mfa_recovery_codes')
        .select('used')
        .eq('user_id', userId);

      if (error) throw error;

      const total = data?.length || 0;
      const unused = data?.filter(c => !c.used).length || 0;
      
      setTotalCount(total);
      setUnusedCount(unused);
    } catch (err) {
      console.error('Error fetching recovery codes status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId && isMFAEnabled) {
      fetchCodeStatus();
    }
  }, [userId, isMFAEnabled]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    
    try {
      // Delete existing codes
      const { error: deleteError } = await supabase
        .from('mfa_recovery_codes')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Generate new codes
      const codes = generateRecoveryCodes();

      // Save new codes
      const { error: insertError } = await supabase
        .from('mfa_recovery_codes')
        .insert(
          codes.map(code => ({
            user_id: userId,
            code: code,
            used: false
          }))
        );

      if (insertError) throw insertError;

      setNewCodes(codes);
      setShowNewCodes(true);
      
      toast({
        title: 'Códigos regenerados!',
        description: 'Novos códigos de recuperação foram gerados. Salve-os em local seguro.'
      });
    } catch (err: any) {
      console.error('Error regenerating codes:', err);
      toast({
        title: 'Erro ao regenerar códigos',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setRegenerating(false);
    }
  };

  const handleConfirmNewCodes = () => {
    setShowNewCodes(false);
    setNewCodes([]);
    fetchCodeStatus();
  };

  if (!isMFAEnabled) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Key className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Códigos de Recuperação</CardTitle>
              <CardDescription>
                Use esses códigos se perder acesso ao app autenticador
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Códigos disponíveis:</span>
                </div>
                <Badge 
                  variant={unusedCount && unusedCount > 2 ? 'default' : 'destructive'}
                  className={unusedCount && unusedCount > 2 ? 'bg-green-500' : ''}
                >
                  {unusedCount} de {totalCount}
                </Badge>
              </div>

              {unusedCount !== null && unusedCount <= 2 && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  ⚠️ Poucos códigos restantes. Considere regenerar novos códigos.
                </p>
              )}

              {totalCount === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum código de recuperação configurado. Gere novos códigos para maior segurança.
                </p>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={handleRegenerate}
                disabled={regenerating}
              >
                {regenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {totalCount === 0 ? 'Gerar códigos' : 'Regenerar códigos'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showNewCodes} onOpenChange={setShowNewCodes}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novos Códigos de Recuperação</DialogTitle>
            <DialogDescription>
              Salve esses códigos em local seguro. Eles substituem os códigos anteriores.
            </DialogDescription>
          </DialogHeader>
          <RecoveryCodesDisplay
            codes={newCodes}
            onConfirm={handleConfirmNewCodes}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
