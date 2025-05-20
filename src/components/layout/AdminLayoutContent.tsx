'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import type { ReactNode} from 'react';
import { useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarContent, SidebarFooter, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { SidebarNav } from './SidebarNav';
import { UserMenu } from './UserMenu';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';

function FullScreenLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <svg className="animate-spin h-10 w-10 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p className="text-lg text-foreground">Loading Dashboard...</p>
    </div>
  );
}


export function AdminLayoutContent({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading, signOutAndRedirect } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!isAdmin) {
        // This case should ideally be handled by AuthProvider redirecting,
        // but as a fallback:
        signOutAndRedirect(); // Signs out and redirects to login
      }
    }
  }, [user, isAdmin, loading, router, signOutAndRedirect]);

  if (loading || !user || !isAdmin) {
    // Show a full-page loader or a minimal loading state.
    // Avoid rendering the layout if not authenticated or still loading.
    return <FullScreenLoader />;
  }
  
  return (
    <SidebarProvider defaultOpen collapsible="icon">
      <Sidebar>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter>
          <UserMenu />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
          <div className="md:hidden"> {/* Only show trigger on mobile, sidebar is controlled by its own logic on desktop */}
            <SidebarTrigger asChild> 
              <Button variant="outline" size="icon">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SidebarTrigger>
          </div>
          {/* Potentially add breadcrumbs or global actions here */}
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
