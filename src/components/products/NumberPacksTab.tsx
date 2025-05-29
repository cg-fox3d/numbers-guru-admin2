
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, Timestamp, doc, deleteDoc, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData, where, QueryConstraint } from 'firebase/firestore';
import type { NumberPack } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, PackageSearch, PlusCircle, Search as SearchIcon, RefreshCcw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { NumberPackDialog } from '@/components/products/dialogs/NumberPackDialog';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ProductActiveFilters } from '@/app/admin/products/page';

interface NumberPacksTabProps {
  categoryMap: Record<string, string>;
  activeFilters: ProductActiveFilters;
}

const PAGE_SIZE = 10;

export function NumberPacksTab({ categoryMap, activeFilters }: NumberPacksTabProps) {
  console.log('NumberPacksTab: Rendering. Active Filters received:', JSON.stringify(activeFilters));

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  // For now, just show the initial loading state to test rendering and prop passing
  
  useEffect(() => {
    console.log("NumberPacksTab: useEffect triggered. activeFilters:", JSON.stringify(activeFilters));
    // Simulate loading for a short period to ensure skeleton shows up
    const timer = setTimeout(() => {
        setIsInitialLoading(false);
        console.log("NumberPacksTab: Simulated initial load complete. isInitialLoading set to false.");
    }, 500); // Reduced timeout for faster testing
    return () => clearTimeout(timer);
  }, [activeFilters]); // Re-simulate if filters change

  if (isInitialLoading) {
    console.log("NumberPacksTab: Currently in isInitialLoading state, rendering skeletons.");
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Number Packs List (Initial Loading...)</CardTitle>
          <CardDescription>Fetching number packs...</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[60vh]">
            <div className="p-6 space-y-2">
              {[...Array(Math.floor(PAGE_SIZE / 2))].map((_, i) => (
                <div key={`skeleton-${i}`} className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-8 w-8 ml-4" />
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  // Placeholder for when not initial loading but no data (or actual data display)
  console.log("NumberPacksTab: Initial loading false. Rendering placeholder for no data / actual content.");
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Number Packs List</CardTitle>
            <CardDescription>Browse and manage number pack bundles. Check console for Firestore index errors or query logs.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" disabled>
              <RefreshCcw className="h-4 w-4" />
              <span className="sr-only">Refresh</span>
            </Button>
            <Button className="bg-primary hover:bg-primary/90" disabled>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Pack
            </Button>
          </div>
        </div>
        <div className="mt-4 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by pack name (on loaded data)..."
            className="pl-10 w-full md:w-1/2 lg:w-1/3"
            disabled
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[60vh]">
            <div className="flex flex-col items-center justify-center text-center p-10 min-h-[300px]">
              <PackageSearch className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold">
                No Number Packs Found (Simplified View)
              </h3>
              <p className="text-muted-foreground">
                Data fetching logic has been temporarily simplified for diagnostics.
              </p>
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
