/*
====================================
FEATURE TEMPORARIAMENTE DESATIVADA
====================================
Versão: v2.0 (pós-validação MVP)
Data desativação: 15/12/2024
Reativar quando: Após validar MVP com 10+ barbearias
Feature: Comandas (Sistema PDV)
====================================
*/

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Scissors, Package } from 'lucide-react';

interface ViewComandaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    booking_date: string;
    booking_time: string;
    service_name: string;
    client_name: string;
    total_price?: number;
  } | null;
}

export const ViewComandaDialog = ({
  open,
  onOpenChange,
  booking,
}: ViewComandaDialogProps) => {
  const [paymentType, setPaymentType] = useState('');
  const [bandeira, setBandeira] = useState('');
  const [valorPago, setValorPago] = useState('');
  const [inserirCaixa, setInserirCaixa] = useState(true);
  const [parcelado, setParcelado] = useState(false);
  const [recebido, setRecebido] = useState('');
  const [troco, setTroco] = useState('');

  if (!booking) return null;

  const totalComanda = booking.total_price || 50.00;

  const handleFinalizarComanda = () => {
    // Implementar finalização da comanda
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Comanda - {booking.client_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tabela de Itens */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Valor Un.</TableHead>
                  <TableHead className="w-16">Qtd</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead className="w-24">P/ Uso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <Scissors className="h-4 w-4" />
                  </TableCell>
                  <TableCell>{totalComanda.toFixed(2)}</TableCell>
                  <TableCell>{totalComanda.toFixed(2)}</TableCell>
                  <TableCell>1</TableCell>
                  <TableCell>{booking.service_name}</TableCell>
                  <TableCell>mendes</TableCell>
                  <TableCell>
                    {/* Ações */}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formas de Pagamento */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Formas de Pagamento</h3>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Tipo de Pagamento</Label>
                  <Select value={paymentType} onValueChange={setPaymentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="credito">Crédito</SelectItem>
                      <SelectItem value="debito">Débito</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Bandeira</Label>
                  <Select value={bandeira} onValueChange={setBandeira}>
                    <SelectTrigger>
                      <SelectValue placeholder="Bandeira" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visa">Visa</SelectItem>
                      <SelectItem value="mastercard">Mastercard</SelectItem>
                      <SelectItem value="elo">Elo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Valor Pago 💵</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={valorPago}
                    onChange={(e) => setValorPago(e.target.value)}
                    placeholder="0,00"
                  />
                </div>

                <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                  ➕ Forma de Pagamento
                </Button>
              </div>
            </div>

            {/* Pagamento */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Pagamento</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total da Comanda:</span>
                  <span className="font-semibold">{totalComanda.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm">Valor Pagamento:</span>
                  <span className="font-semibold">{totalComanda.toFixed(2)}</span>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox 
                    id="inserir-caixa" 
                    checked={inserirCaixa}
                    onCheckedChange={(checked) => setInserirCaixa(checked as boolean)}
                  />
                  <Label htmlFor="inserir-caixa" className="text-sm cursor-pointer">
                    Inserir no Caixa? ⓘ
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="parcelado" 
                    checked={parcelado}
                    onCheckedChange={(checked) => setParcelado(checked as boolean)}
                  />
                  <Label htmlFor="parcelado" className="text-sm cursor-pointer">
                    Parcelado?
                  </Label>
                </div>
              </div>
            </div>

            {/* Troco */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Troco ⓘ</h3>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Recebido:</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={recebido}
                    onChange={(e) => setRecebido(e.target.value)}
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Troco:</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={troco}
                    onChange={(e) => setTroco(e.target.value)}
                    placeholder="0,00"
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 justify-end">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="bg-amber-500 hover:bg-amber-600 text-white border-0"
          >
            Fechar
          </Button>
          <Button 
            onClick={handleFinalizarComanda}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Finalizar Comanda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
