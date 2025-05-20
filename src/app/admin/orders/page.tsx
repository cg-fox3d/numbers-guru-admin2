import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';
import Image from 'next/image';

export default function OrdersPage() {
  return (
    <>
      <PageHeader
        title="Orders"
        description="View and manage customer orders."
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <span>Order Management</span>
          </CardTitle>
          <CardDescription>
            This section for managing orders is currently under construction. 
            You will soon be able to view order details, update statuses, and more.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center p-10">
          <Image 
            src="https://placehold.co/400x300.png" 
            alt="Feature Coming Soon" 
            width={400} 
            height={300} 
            className="rounded-lg mb-6 opacity-80"
            data-ai-hint="calendar planning"
          />
          <h3 className="text-xl font-semibold text-foreground mb-2">Exciting Features on the Way!</h3>
          <p className="text-muted-foreground max-w-md">
            Our team is developing a robust order management system. 
            Please check back later for full functionality.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
