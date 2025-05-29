
'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Filter as FilterIcon } from 'lucide-react';
import { VipNumbersTab } from '@/components/products/VipNumbersTab';
import { NumberPacksTab } from '@/components/products/NumberPacksTab';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import type { Category } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const VIP_NUMBER_STATUSES = ["available", "sold", "booked"];
const NUMBER_PACK_STATUSES = ["available", "sold", "partially-sold"];
const ALL_PRODUCT_STATUSES = Array.from(new Set([...VIP_NUMBER_STATUSES, ...NUMBER_PACK_STATUSES])).sort();


export interface ProductActiveFilters {
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
}

export default function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const { toast } = useToast();
  
  // Filter input states
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>(undefined);
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCategorySlug, setFilterCategorySlug] = useState<string>('');
  const [filterMinPrice, setFilterMinPrice] = useState<string>('');
  const [filterMaxPrice, setFilterMaxPrice] = useState<string>('');
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  
  // Applied filters
  const [activeFilters, setActiveFilters] = useState<ProductActiveFilters>({});

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
        description: (error as Error).message || "Could not load categories for product tabs/filters.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCategories(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleApplyFilters = () => {
    const newActiveFilters: ProductActiveFilters = {};
    if (filterDateFrom) newActiveFilters.dateFrom = filterDateFrom;
    if (filterDateTo) newActiveFilters.dateTo = filterDateTo;
    if (filterStatus) newActiveFilters.status = filterStatus;
    if (filterCategorySlug) newActiveFilters.categorySlug = filterCategorySlug;
    
    const minPriceNum = parseFloat(filterMinPrice);
    if (!isNaN(minPriceNum) && filterMinPrice.trim() !== '') newActiveFilters.minPrice = minPriceNum;
    
    const maxPriceNum = parseFloat(filterMaxPrice);
    if (!isNaN(maxPriceNum) && filterMaxPrice.trim() !== '') newActiveFilters.maxPrice = maxPriceNum;

    setActiveFilters(newActiveFilters);
    setIsFilterPopoverOpen(false);
  };

  const handleClearFilters = useCallback(() => {
    setFilterDateFrom(undefined);
    setFilterDateTo(undefined);
    setFilterStatus('');
    setFilterCategorySlug('');
    setFilterMinPrice('');
    setFilterMaxPrice('');
    setActiveFilters({});
    setIsFilterPopoverOpen(false); // Close popover if open
  }, []); // Empty dependency array as setters are stable
  
  const getActiveFilterCount = () => {
    return Object.values(activeFilters).filter(v => {
      if (v === undefined || v === '') return false;
      if (typeof v === 'number' && isNaN(v)) return false;
      return true;
    }).length;
  };

  const handleTabChange = () => {
    handleClearFilters();
  };

  return (
    <>
      <PageHeader
        title="Products Management"
        description="Manage your VIP numbers and number packs. Filters apply to the active tab."
        actions={
          <div className="flex items-center gap-2">
            <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" disabled={isLoadingCategories}>
                  <FilterIcon className="mr-2 h-4 w-4" />
                  Filters {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Product Filters</h4>
                    <p className="text-sm text-muted-foreground">
                      Apply filters to products in the active tab.
                    </p>
                  </div>
                  <div className="grid gap-3 max-h-[60vh] overflow-y-auto p-1">
                     <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label htmlFor="productDateFrom">From Date (Created)</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button id="productDateFrom" variant={"outline"} className="w-full justify-start text-left font-normal" >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filterDateFrom ? format(filterDateFrom, "PPP") : <span>Pick a date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={filterDateFrom} onSelect={setFilterDateFrom} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div>
                            <Label htmlFor="productDateTo">To Date (Created)</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button id="productDateTo" variant={"outline"} className="w-full justify-start text-left font-normal" >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filterDateTo ? format(filterDateTo, "PPP") : <span>Pick a date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={filterDateTo} onSelect={setFilterDateTo} disabled={(date) => filterDateFrom ? date < filterDateFrom : false } initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <div>
                      <Label htmlFor="productStatus">Status</Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger id="productStatus">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_PRODUCT_STATUSES.map(status => (
                            <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="productCategory">Category</Label>
                      <Select value={filterCategorySlug} onValueChange={setFilterCategorySlug} disabled={isLoadingCategories || categories.length === 0}>
                        <SelectTrigger id="productCategory">
                            <SelectValue placeholder={isLoadingCategories ? "Loading cats..." : "All Categories"} />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => {
                            if (!category.slug || category.slug.trim() === '') return null; // Skip categories with empty slugs
                            return (
                              <SelectItem key={category.id} value={category.slug}>{category.title}</SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label htmlFor="productMinPrice">Min Price (₹)</Label>
                            <Input id="productMinPrice" type="number" placeholder="e.g., 1000" value={filterMinPrice} onChange={e => setFilterMinPrice(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="productMaxPrice">Max Price (₹)</Label>
                            <Input id="productMaxPrice" type="number" placeholder="e.g., 50000" value={filterMaxPrice} onChange={e => setFilterMaxPrice(e.target.value)} />
                        </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button variant="ghost" onClick={handleClearFilters}>Clear</Button>
                    <Button onClick={handleApplyFilters} className="bg-primary hover:bg-primary/90">Apply Filters</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        }
      />

      {isLoadingCategories && !categories.length ? ( 
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/3 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <Tabs defaultValue="vipNumbers" className="w-full" onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2 md:w-1/2 lg:w-1/3 mb-6">
            <TabsTrigger value="vipNumbers">VIP Numbers</TabsTrigger>
            <TabsTrigger value="numberPacks">Number Packs</TabsTrigger>
          </TabsList>
          <TabsContent value="vipNumbers">
            <VipNumbersTab categoryMap={categoryMap} activeFilters={activeFilters} />
          </TabsContent>
          <TabsContent value="numberPacks">
            <NumberPacksTab categoryMap={categoryMap} activeFilters={activeFilters} />
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}
    

