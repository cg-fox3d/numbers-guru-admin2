
'use client';

import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle } from 'lucide-react';
import { VipNumbersTab } from '@/components/products/VipNumbersTab';
import { NumberPacksTab } from '@/components/products/NumberPacksTab';

export default function ProductsPage() {
  return (
    <>
      <PageHeader
        title="Products Management"
        description="Manage your VIP numbers and number packs."
        actions={
          <Button disabled className="bg-primary hover:bg-primary/90">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
          </Button>
        }
      />

      <Tabs defaultValue="vipNumbers" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-1/2 lg:w-1/3 mb-6">
          <TabsTrigger value="vipNumbers">VIP Numbers</TabsTrigger>
          <TabsTrigger value="numberPacks">Number Packs</TabsTrigger>
        </TabsList>
        <TabsContent value="vipNumbers">
          <VipNumbersTab />
        </TabsContent>
        <TabsContent value="numberPacks">
          <NumberPacksTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
