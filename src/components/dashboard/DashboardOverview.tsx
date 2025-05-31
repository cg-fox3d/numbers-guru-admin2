
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, Package, Users, ShoppingBag, ExternalLink, FileText, FolderKanban, PlusCircle, TrendingUp, Undo2, Sigma } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getCountFromServer, query, where, Timestamp, getDocs } from 'firebase/firestore';
import type { DashboardStats, AdminOrder } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const StatCard = ({ title, value, icon: Icon, description, isLoading }: { title: string; value: string | number; icon: React.ElementType; description?: string; isLoading?: boolean }) => (
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

const initialStats: DashboardStats = {
  totalRevenue: 0,
  newCustomersThisMonth: 0,
  ordersThisMonth: 0,
  vipNumbersInStock: 0,
  numberPacksInStock: 0,
  totalCustomers: 0,
  totalOrders: 0,
  totalRefunds: 0,
  monthlyOrdersData: [],
};

const chartConfig = {
  orders: {
    label: "Orders",
    color: "hsl(var(--chart-1))",
  },
} satisfies import("@/components/ui/chart").ChartConfig;


export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const vipNumbersCol = collection(db, 'vipNumbers');
        const numberPacksCol = collection(db, 'numberPacks');
        const ordersCol = collection(db, 'orders');
        const usersCol = collection(db, 'users');
        const refundsCol = collection(db, 'refunds');

        // Products in Stock
        const availableVipNumbersQuery = query(vipNumbersCol, where('status', '==', 'available'));
        const availableNumberPacksQuery = query(numberPacksCol, where('status', '==', 'available'));
        const vipNumbersSnapshot = await getCountFromServer(availableVipNumbersQuery);
        const numberPacksSnapshot = await getCountFromServer(availableNumberPacksQuery);
        const vipNumbersInStock = vipNumbersSnapshot.data().count;
        const numberPacksInStock = numberPacksSnapshot.data().count;

        // Total Revenue (from 'paid' or 'delivered' orders)
        const revenueOrdersQuery = query(ordersCol, where('orderStatus', 'in', ['paid', 'delivered']));
        const revenueOrdersDocs = await getDocs(revenueOrdersQuery);
        let totalRevenue = 0;
        revenueOrdersDocs.forEach(doc => {
          totalRevenue += (doc.data() as AdminOrder).amount || 0;
        });
        
        // Orders This Month
        const currentDate = new Date();
        const firstDayOfMonth = startOfMonth(currentDate);
        const ordersThisMonthQuery = query(ordersCol, where('orderDate', '>=', Timestamp.fromDate(firstDayOfMonth)));
        const ordersThisMonthSnapshot = await getCountFromServer(ordersThisMonthQuery);
        const ordersThisMonth = ordersThisMonthSnapshot.data().count;

        // New Customers This Month
        const newCustomersQuery = query(usersCol, where('createdAt', '>=', Timestamp.fromDate(firstDayOfMonth)));
        const newCustomersSnapshot = await getCountFromServer(newCustomersQuery);
        const newCustomersThisMonth = newCustomersSnapshot.data().count;

        // Total Counts
        const totalCustomersSnapshot = await getCountFromServer(usersCol);
        const totalOrdersSnapshot = await getCountFromServer(ordersCol);
        const totalRefundsSnapshot = await getCountFromServer(refundsCol);
        const totalCustomers = totalCustomersSnapshot.data().count;
        const totalOrders = totalOrdersSnapshot.data().count;
        const totalRefunds = totalRefundsSnapshot.data().count;

        // Monthly Orders Data for Chart (Last 6 Months)
        const monthlyOrdersData: { month: string; orders: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const targetMonthDate = subMonths(currentDate, i);
          const monthStart = startOfMonth(targetMonthDate);
          const monthEnd = endOfMonth(targetMonthDate);
          
          const monthlyQuery = query(
            ordersCol,
            where('orderDate', '>=', Timestamp.fromDate(monthStart)),
            where('orderDate', '<=', Timestamp.fromDate(monthEnd))
          );
          const monthlySnapshot = await getCountFromServer(monthlyQuery);
          monthlyOrdersData.push({
            month: format(monthStart, 'MMM yy'),
            orders: monthlySnapshot.data().count,
          });
        }

        setStats({
          totalRevenue,
          newCustomersThisMonth,
          ordersThisMonth,
          vipNumbersInStock,
          numberPacksInStock,
          totalCustomers,
          totalOrders,
          totalRefunds,
          monthlyOrdersData,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} icon={DollarSign} isLoading={isLoading} description="From 'paid' or 'delivered' orders" />
        <StatCard title="Orders This Month" value={stats.ordersThisMonth} icon={ShoppingBag} isLoading={isLoading} />
        <StatCard title="New Customers This Month" value={stats.newCustomersThisMonth} icon={Users} isLoading={isLoading} description="Based on user registration date" />
        <StatCard title="Total Customers" value={stats.totalCustomers} icon={Users} isLoading={isLoading} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="VIP Numbers in Stock" value={stats.vipNumbersInStock} icon={Sigma} isLoading={isLoading} />
        <StatCard title="Number Packs in Stock" value={stats.numberPacksInStock} icon={Package} isLoading={isLoading} />
        <StatCard title="Total Orders" value={stats.totalOrders} icon={ShoppingBag} isLoading={isLoading} />
        <StatCard title="Total Refunds" value={stats.totalRefunds} icon={Undo2} isLoading={isLoading} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Monthly Orders (Last 6 Months)
            </CardTitle>
            <CardDescription>Overview of order volume over the past six months.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : stats.monthlyOrdersData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart accessibilityLayer data={stats.monthlyOrdersData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                    allowDecimals={false}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar dataKey="orders" fill="hsl(var(--chart-1))" radius={4} />
                   <ChartLegend content={<ChartLegendContent />} />
                </BarChart>
              </ChartContainer>
            ) : (
                <div className="flex h-[300px] w-full items-center justify-center">
                    <p className="text-muted-foreground">No order data available for the chart.</p>
                </div>
            )}
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
             <Link href="/admin/transactions" className="flex items-center text-primary hover:underline">
              <FileText className="mr-2 h-4 w-4" /> View Transactions
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
            This dashboard provides an overview of key metrics. For very large datasets, some calculations (like total revenue) might benefit from backend aggregation for optimal performance. Ensure Firestore indexes are configured for date fields used in queries.
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
