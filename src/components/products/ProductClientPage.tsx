'use client';

import type { UseFormReturn } from 'react-hook-form';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/types';
import { PlusCircle, Search } from 'lucide-react';
import { ProductDialog } from './ProductDialog';
import { ProductTable } from './ProductTable';
import { PageHeader } from '@/components/common/PageHeader';
import type { ProductFormValues } from '@/lib/schemas'; // Assuming this type is exported


const initialProducts: Product[] = [
  { id: '1', name: 'Ultra Premium 0001', type: 'VIP Number', price: 50000, number: '98XXXX0001', description: 'Rare sequence number', createdAt: new Date() },
  { id: '2', name: 'Starter Pack', type: 'Number Pack', price: 10000, packDetails: 'Includes 3 semi-VIP numbers', createdAt: new Date() },
  { id: '3', name: 'Gold Series 7777', type: 'VIP Number', price: 25000, number: '97XXXX7777', createdAt: new Date() },
];


export function ProductClientPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const { toast } = useToast();

  const handleAddProduct = () => {
    setEditingProduct(undefined);
    setIsDialogOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts(products.filter((p) => p.id !== productId));
    toast({ title: 'Product Deleted', description: 'The product has been successfully deleted.' });
  };

  const handleSubmitProduct = (values: ProductFormValues, form: UseFormReturn<ProductFormValues>) => {
    if (editingProduct) {
      setProducts(products.map((p) => (p.id === editingProduct.id ? { ...editingProduct, ...values, price: Number(values.price) } : p)));
      toast({ title: 'Product Updated', description: 'The product has been successfully updated.' });
    } else {
      const newProduct: Product = {
        id: String(Date.now()),
        ...values,
        price: Number(values.price),
        createdAt: new Date(),
      };
      setProducts([newProduct, ...products]);
      toast({ title: 'Product Added', description: 'The new product has been successfully added.' });
    }
    form.reset();
    setIsDialogOpen(false);
    setEditingProduct(undefined);
  };
  
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.number && product.number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <PageHeader
        title="Product Management"
        description="Manage your VIP numbers and number packs."
        actions={
          <Button onClick={handleAddProduct} className="bg-primary hover:bg-primary/90">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Product
          </Button>
        }
      />

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search products by name or number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full md:w-1/2 lg:w-1/3"
          />
        </div>
      </div>
      
      <ProductTable products={filteredProducts} onEdit={handleEditProduct} onDelete={handleDeleteProduct} />

      {isDialogOpen && (
         <ProductDialog
            isOpen={isDialogOpen}
            onClose={() => {
                setIsDialogOpen(false);
                setEditingProduct(undefined);
            }}
            onSubmit={handleSubmitProduct}
            defaultValues={editingProduct}
            isEditing={!!editingProduct}
        />
      )}
    </>
  );
}
