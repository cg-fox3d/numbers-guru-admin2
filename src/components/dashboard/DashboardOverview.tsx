
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, Package, Users, ShoppingBag, ExternalLink, FileText, FolderKanban, PlusCircle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getCountFromServer, query, where, Timestamp } from 'firebase/firestore';
import type { DashboardStats } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

const StatCard = ({ title, value, icon: Icon, description, isLoading }: { title: string; value: string; icon: React.ElementType; description?: string; isLoading?: boolean }) => (
  <Card className="shadow-lg">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <>
          <Skeleton className="h-8 w-24 mb-1" />
          {description && <Skeleton className="h-4 w-32" />}
        </>
      ) : (
        <>
          <div className="text-2xl font-bold">{value}</div>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </>
      )}
    </CardContent>
  </Card>
);

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    newCustomers: 0,
    ordersThisMonth: 0,
    productsInStock: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const vipNumbersCol = collection(db, 'vipNumbers');
        const numberPacksCol = collection(db, 'numberPacks');
        const ordersCol = collection(db, 'orders');
        // const usersCol = collection(db, 'users'); // For new customers, if synced

        const activeVipNumbersQuery = query(vipNumbersCol, where('status', '==', 'available'));
        const activeNumberPacksQuery = query(numberPacksCol, where('status', '==', 'available'));
        
        const vipNumbersSnapshot = await getCountFromServer(activeVipNumbersQuery);
        const numberPacksSnapshot = await getCountFromServer(activeNumberPacksQuery);
        const productsInStock = vipNumbersSnapshot.data().count + numberPacksSnapshot.data().count;

        // Placeholder for revenue - requires summing order totals
        const totalRevenue = 0; 

        // Placeholder for new customers - requires querying users collection or different logic
        const newCustomers = 0; 

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const ordersThisMonthQuery = query(ordersCol, where('orderDate', '>=', Timestamp.fromDate(startOfMonth)));
        const ordersThisMonthSnapshot = await getCountFromServer(ordersThisMonthQuery);
        const ordersThisMonth = ordersThisMonthSnapshot.data().count;

        setStats({
          totalRevenue,
          newCustomers,
          ordersThisMonth,
          productsInStock,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        // Handle error appropriately, maybe set stats to error state or show toast
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} icon={DollarSign} isLoading={isLoading} description="Fetched from orders" />
        <StatCard title="New Customers" value={String(stats.newCustomers)} icon={Users} isLoading={isLoading} description="Placeholder value" />
        <StatCard title="Orders This Month" value={String(stats.ordersThisMonth)} icon={ShoppingBag} isLoading={isLoading} />
        <StatCard title="Products in Stock" value={String(stats.productsInStock)} icon={Package} isLoading={isLoading} description="VIP Numbers + Packs" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Real-time recent activity feed coming soon. This will show new orders, customer registrations, etc.</p>
            <div className="mt-4 h-64 w-full bg-muted rounded-md flex items-center justify-center">
               <FileText className="h-16 w-16 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/products" className="flex items-center text-primary hover:underline">
              <Package className="mr-2 h-4 w-4" /> Manage Products
            </Link>
            <Link href="/admin/categories" className="flex items-center text-primary hover:underline">
              <FolderKanban className="mr-2 h-4 w-4" /> Manage Categories
            </Link>
            <Link href="/admin/orders" className="flex items-center text-primary hover:underline">
              <ShoppingBag className="mr-2 h-4 w-4" /> View Orders
            </Link>
            <Link href="/admin/customers" className="flex items-center text-primary hover:underline">
              <Users className="mr-2 h-4 w-4" /> Customer List
            </Link>
            <Link href="https://numbersguru.com" target="_blank" rel="noopener noreferrer" className="flex items-center text-primary hover:underline">
              <ExternalLink className="mr-2 h-4 w-4" /> Main Site
            </Link>
          </CardContent>
        </Card>
      </div>
       <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Developer Note</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            Full CRUD (Create, Read, Update, Delete) functionality for Products and Categories, detailed Order management, and a comprehensive Customer list (from Firestore `users` collection and Firebase Auth) will be implemented in subsequent updates. This initial setup focuses on displaying existing data and placeholders.
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
