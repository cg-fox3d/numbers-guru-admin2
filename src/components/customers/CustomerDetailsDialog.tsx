
'use client';

import type { AdminDisplayCustomer } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format, isValid } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CustomerDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: AdminDisplayCustomer | null;
}

const DetailItem = ({ label, value }: { label: string; value?: string | number | null }) => (
  value !== undefined && value !== null && (
    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border/50 last:border-b-0">
      <dt className="font-medium text-muted-foreground col-span-1">{label}:</dt>
      <dd className="text-foreground col-span-2 break-words">{String(value)}</dd>
    </div>
  )
);

const formatTimestamp = (timestamp?: Timestamp): string => {
  if (!timestamp) return 'N/A';
  try {
    const date = timestamp.toDate();
    return isValid(date) ? format(date, 'PPpp') : String(timestamp);
  } catch (e) {
    return String(timestamp); // Fallback if it's not a valid Timestamp object
  }
};

export function CustomerDetailsDialog({ isOpen, onClose, customer }: CustomerDetailsDialogProps) {
  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Customer Details: {customer.name || customer.email}</DialogTitle>
          <DialogDescription>
            Viewing details for customer ID: {customer.id}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] p-1 pr-4">
          <div className="space-y-2 py-4 text-sm">
            <h4 className="font-semibold text-lg mb-2 border-b pb-1">Customer Information</h4>
            <DetailItem label="Customer ID (UID)" value={customer.id} />
            <DetailItem label="Email" value={customer.email} />
            <DetailItem label="Name" value={customer.name || 'N/A'} />
            <DetailItem label="Registered On" value={formatTimestamp(customer.createdAt)} />
            {/* Add more fields here if they exist in your AdminDisplayCustomer type */}
            {/* e.g., <DetailItem label="Phone" value={customer.phone || 'N/A'} /> */}
            {/* e.g., <DetailItem label="Last Login" value={formatTimestamp(customer.lastLoginAt)} /> */}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
