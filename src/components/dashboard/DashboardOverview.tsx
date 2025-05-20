import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Package, ShoppingCart, Users } from 'lucide-react';
import Image from 'next/image';

const StatCard = ({ title, value, icon: Icon, description }: { title: string; value: string; icon: React.ElementType; description?: string }) => (
  <Card className="shadow-lg">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </CardContent>
  </Card>
);

export function DashboardOverview() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Revenue" value="₹1,25,430" icon={DollarSign} description="+20.1% from last month" />
        <StatCard title="Active Products" value="150" icon={Package} description="+10 since last week" />
        <StatCard title="Pending Orders" value="12" icon={ShoppingCart} description="2 urgent" />
        <StatCard title="New Customers" value="8" icon={Users} description="+5 this month" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No recent activity to display. Check back later for updates on orders, customer registrations, and product updates.</p>
            {/* Placeholder for a chart or list of recent activities */}
            <div className="mt-4 h-64 w-full bg-muted rounded-md flex items-center justify-center">
              <Image src="https://placehold.co/600x300.png" alt="Activity placeholder" width={600} height={300} className="rounded-md opacity-50" data-ai-hint="data graph" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a href="/admin/products" className="block text-primary hover:underline">Manage Products</a>
            <a href="/admin/orders" className="block text-primary hover:underline">View Orders</a>
            <a href="/admin/customers" className="block text-primary hover:underline">Customer List</a>
            <a href="#" className="block text-primary hover:underline">Settings (Placeholder)</a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
