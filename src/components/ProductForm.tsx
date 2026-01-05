/*
====================================
FEATURE TEMPORARIAMENTE DESATIVADA
====================================
Versão: v2.0 (pós-validação MVP)
Data desativação: 15/12/2024
Reativar quando: Após validar MVP com 10+ barbearias
Feature: Produtos (E-commerce)
====================================
*/

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Package, Edit, Trash2 } from 'lucide-react';
import { productFormSchema, validateWithSchema, formatValidationErrors, sanitizeString, VALIDATION_CONSTANTS } from '@/lib/validation-schemas';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
}

interface ProductFormProps {
  barbershopId: string;
  products: Product[];
  onProductsChange: () => void;
}

const ProductForm = ({ barbershopId, products, onProductsChange }: ProductFormProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock_quantity: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      stock_quantity: ''
    });
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação com Zod
    const validation = validateWithSchema(productFormSchema, formData);
    if (!validation.success) {
      toast({
        title: 'Erro de validação',
        description: formatValidationErrors(validation.errors),
        variant: 'destructive'
      });
      return;
    }

    // Validar preço e estoque
    const price = parseFloat(formData.price);
    const stock = parseInt(formData.stock_quantity);
    
    if (isNaN(price) || price < VALIDATION_CONSTANTS.PRICE_MIN || price > VALIDATION_CONSTANTS.PRICE_MAX) {
      toast({
        title: 'Erro de validação',
        description: `Preço deve estar entre R$ ${VALIDATION_CONSTANTS.PRICE_MIN} e R$ ${VALIDATION_CONSTANTS.PRICE_MAX.toLocaleString('pt-BR')}`,
        variant: 'destructive'
      });
      return;
    }

    if (isNaN(stock) || stock < VALIDATION_CONSTANTS.STOCK_MIN || stock > VALIDATION_CONSTANTS.STOCK_MAX) {
      toast({
        title: 'Erro de validação',
        description: `Estoque deve estar entre ${VALIDATION_CONSTANTS.STOCK_MIN} e ${VALIDATION_CONSTANTS.STOCK_MAX}`,
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const productData = {
        barbershop_id: barbershopId,
        name: sanitizeString(formData.name),
        description: sanitizeString(formData.description),
        price: price,
        stock_quantity: stock,
        is_active: true
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        
        if (error) throw error;
        
        toast({
          title: "Produto atualizado!",
          description: "O produto foi atualizado com sucesso."
        });
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);
        
        if (error) throw error;
        
        toast({
          title: "Produto adicionado!",
          description: "O produto foi criado com sucesso."
        });
      }

      setIsOpen(false);
      resetForm();
      onProductsChange();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar produto",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      stock_quantity: product.stock_quantity.toString()
    });
    setIsOpen(true);
  };

  const handleDelete = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      
      if (error) throw error;
      
      toast({
        title: "Produto removido!",
        description: "O produto foi removido com sucesso."
      });
      
      onProductsChange();
    } catch (error: any) {
      toast({
        title: "Erro ao remover produto",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Produtos</CardTitle>
          <CardDescription>
            Gerencie os produtos vendidos pela sua barbearia
          </CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Produto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Produto</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Pomada para Cabelo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o produto..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="15.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Estoque</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
                    placeholder="10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Salvando...' : (editingProduct ? 'Atualizar' : 'Criar')} Produto
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum produto cadastrado. Adicione produtos para venda aos clientes.
          </p>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-medium">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.description}</p>
                    <p className="text-sm">
                      <span className="font-medium">R$ {product.price.toFixed(2)}</span> • Estoque: {product.stock_quantity}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(product)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductForm;