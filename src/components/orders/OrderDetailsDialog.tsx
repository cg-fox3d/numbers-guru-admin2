
'use client';

import type { AdminOrder } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OrderDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: AdminOrder | null;
}

const DetailItem = ({ label, value }: { label: string; value?: string | number | null }) => (
  value !== undefined && value !== null && (
    <div className="grid grid-cols-3 gap-2 py-1">
      <dt className="font-medium text-muted-foreground col-span-1">{label}:</dt>
      <dd className="text-foreground col-span-2">{String(value)}</dd>
    </div>
  )
);

const formatTimestamp = (timestamp?: Timestamp): string => {
  if (!timestamp) return 'N/A';
  try {
    return format(timestamp.toDate(), 'PPpp');
  } catch (e) {
    return String(timestamp); // Fallback if it's not a valid Timestamp object
  }
};

const formatCurrency = (amount?: number, currency?: string): string => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR' }).format(amount);
};


export function OrderDetailsDialog({ isOpen, onClose, order }: OrderDetailsDialogProps) {
  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Order Details: {order.orderId}</DialogTitle>
          <DialogDescription>
            Full details for order placed by {order.customerName}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] p-1 pr-4">
          <div className="space-y-3 py-4 text-sm">
            <h4 className="font-semibold text-lg mb-2 border-b pb-1">Order Information</h4>
            <DetailItem label="Order ID" value={order.orderId} />
            <DetailItem label="Status" value={order.orderStatus} />
            <DetailItem label="Payment Status" value={order.paymentStatus} />
            <DetailItem label="Amount" value={formatCurrency(order.amount, order.currency)} />
            <DetailItem label="Currency" value={order.currency} />
            <DetailItem label="Items Summary" value={order.items} />
            <DetailItem label="Item Count" value={order.itemCount} />
            <DetailItem label="Order Date" value={formatTimestamp(order.orderDate)} />
            <DetailItem label="Created At" value={formatTimestamp(order.createdAt)} />
            <DetailItem label="Last Updated" value={formatTimestamp(order.updatedAt)} />
            
            <h4 className="font-semibold text-lg mt-4 mb-2 border-b pb-1">Customer Information</h4>
            <DetailItem label="Name" value={order.customerName} />
            <DetailItem label="Email" value={order.customerEmail} />
            <DetailItem label="Customer ID" value={order.customerId} />
            <DetailItem label="User ID (Auth)" value={order.userId} />

            <h4 className="font-semibold text-lg mt-4 mb-2 border-b pb-1">Payment Details</h4>
            <DetailItem label="Payment ID" value={order.paymentId} />
            <DetailItem label="Receipt" value={order.receipt} />

            {order.notes && Object.keys(order.notes).length > 0 && (
              <>
                <h4 className="font-semibold text-lg mt-4 mb-2 border-b pb-1">Additional Notes</h4>
                {Object.entries(order.notes).map(([key, value]) => {
                  if (key === 'selectedOriginalVipNumberIds' && Array.isArray(value)) {
                    return (
                      <div key={key} className="grid grid-cols-3 gap-2 py-1">
                        <dt className="font-medium text-muted-foreground col-span-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</dt>
                        <dd className="text-foreground col-span-2">
                          {value.length > 0 ? value.join(', ') : 'N/A'}
                        </dd>
                      </div>
                    );
                  }
                  return <DetailItem key={key} label={key.replace(/([A-Z])/g, ' $1').capitalize()} value={String(value)} />;
                })}
              </>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper to capitalize string (for note keys)
String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
}
