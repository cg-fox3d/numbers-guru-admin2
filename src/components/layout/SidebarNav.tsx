
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  FolderKanban,
  ShoppingCart,
  Users,
  ExternalLink,
  Sigma,
  ListChecks,
  Undo2,
} from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/categories', label: 'Categories', icon: FolderKanban },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/transactions', label: 'Transactions', icon: ListChecks },
  { href: '/admin/refunds', label: 'Refunds', icon: Undo2 },
  { href: '/admin/customers', label: 'Customers', icon: Users },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      <div className="flex items-center gap-2 px-2 py-4 group-data-[collapsible=icon]:justify-center">
        <Sigma className="h-7 w-7 text-primary flex-shrink-0" />
        <h1 className="text-xl font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
          NumeroDash
        </h1>
      </div>
      <SidebarMenu className="flex-1 px-2">
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href}>
              <SidebarMenuButton
                isActive={pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))}
                className={cn(
                  'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  (pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))) &&
                  'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground'
                )}
                tooltip={{ children: item.label, className: "bg-popover text-popover-foreground border shadow-md" }}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
       <SidebarMenu className="mt-auto px-2 pb-2">
        <SidebarMenuItem>
           <Link href="https://numbersguru.com" target="_blank" rel="noopener noreferrer">
            <SidebarMenuButton className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" tooltip={{children: "Main Site", className: "bg-popover text-popover-foreground border shadow-md"}}>
              <ExternalLink />
              <span>Main Site</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}
