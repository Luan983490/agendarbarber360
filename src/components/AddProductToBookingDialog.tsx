import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AddProductToBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  barbershopId: string;
}

export const AddProductToBookingDialog = ({
  open,
  onOpenChange,
  bookingId,
  barbershopId,
}: AddProductToBookingDialogProps) => {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchProducts();
    }
  }, [open, barbershopId]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Erro ao carregar produtos",
        description: "Não foi possível carregar a lista de produtos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedProductId) {
      toast({
        title: "Selecione um produto",
        description: "Por favor, selecione um produto antes de adicionar.",
        variant: "destructive",
      });
      return;
    }

    const selectedProduct = products.find(p => p.id === selectedProductId);
    if (!selectedProduct) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('booking_products')
        .insert({
          booking_id: bookingId,
          product_id: selectedProductId,
          quantity: quantity,
          unit_price: selectedProduct.price,
        });

      if (error) throw error;

      toast({
        title: "Produto adicionado",
        description: `${selectedProduct.name} (${quantity}x) foi adicionado ao agendamento.`,
      });
      
      onOpenChange(false);
      setSelectedProductId('');
      setQuantity(1);
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: "Erro ao adicionar produto",
        description: "Não foi possível adicionar o produto ao agendamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const totalPrice = selectedProduct ? selectedProduct.price * quantity : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Produto</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="product">Selecione o Produto</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger id="product">
                <SelectValue placeholder="Escolha um produto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} - R$ {product.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            />
          </div>

          {selectedProduct && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total:</span>
                <span className="text-lg font-bold">R$ {totalPrice.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="w-full sm:w-auto"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleAdd} 
            className="w-full sm:w-auto"
            disabled={loading || !selectedProductId}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
