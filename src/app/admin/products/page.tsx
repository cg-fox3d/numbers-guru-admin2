
'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle } from 'lucide-react';
import { VipNumbersTab } from '@/components/products/VipNumbersTab';
import { NumberPacksTab } from '@/components/products/NumberPacksTab';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import type { Category } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const { toast } = useToast();

  const loadCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
      const querySnapshot = await getDocs(q);
      const fetchedCategories: Category[] = [];
      const newCategoryMap: Record<string, string> = {};
      querySnapshot.forEach((doc) => {
        const category = { id: doc.id, ...doc.data() } as Category;
        fetchedCategories.push(category);
        newCategoryMap[category.slug] = category.title;
      });
      setCategories(fetchedCategories);
      setCategoryMap(newCategoryMap);
    } catch (error) {
      console.error("Error fetching categories: ", error);
      toast({
        title: "Error Fetching Categories",
        description: (error as Error).message || "Could not load categories for product tabs.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCategories(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return (
    <>
      <PageHeader
        title="Products Management"
        description="Manage your VIP numbers and number packs."
        // "Add New Product" button is now tab-specific
      />

      {isLoadingCategories ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/3 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <Tabs defaultValue="vipNumbers" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-1/2 lg:w-1/3 mb-6">
            <TabsTrigger value="vipNumbers">VIP Numbers</TabsTrigger>
            <TabsTrigger value="numberPacks">Number Packs</TabsTrigger>
          </TabsList>
          <TabsContent value="vipNumbers">
            <VipNumbersTab categoryMap={categoryMap} />
          </TabsContent>
          <TabsContent value="numberPacks">
            <NumberPacksTab categoryMap={categoryMap} />
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}
