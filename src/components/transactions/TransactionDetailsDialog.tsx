
'use client';

import type { Transaction } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, isValid } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TransactionDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

const DetailItem = ({ label, value }: { label: string; value?: string | number | boolean | null }) => (
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

const formatCurrency = (amount?: number, currency?: string): string => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR' }).format(amount);
};

const getStatusVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
    const lowerStatus = status?.toLowerCase();
    if (['succeeded', 'paid', 'completed', 'captured'].includes(lowerStatus || '')) return 'default';
    if (['pending', 'processing'].includes(lowerStatus || '')) return 'secondary';
    if (['failed', 'cancelled', 'disputed'].includes(lowerStatus || '')) return 'destructive';
    return 'outline';
};

export function TransactionDetailsDialog({ isOpen, onClose, transaction }: TransactionDetailsDialogProps) {
  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Transaction Details: {transaction.paymentId}</DialogTitle>
          <DialogDescription>
            Full details for payment ID {transaction.paymentId}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] p-1 pr-4">
          <div className="space-y-2 py-4 text-sm">
            <h4 className="font-semibold text-lg mb-2 border-b pb-1">Transaction Information</h4>
            <DetailItem label="Payment ID" value={transaction.paymentId} />
            <DetailItem label="Order ID" value={transaction.orderId} />
            <DetailItem label="Amount" value={formatCurrency(transaction.amount, transaction.currency)} />
            <DetailItem label="Currency" value={transaction.currency} />
            <DetailItem label="Status">
                 <Badge variant={getStatusVariant(transaction.status)} className="capitalize text-xs">
                    {transaction.status || 'N/A'}
                </Badge>
            </DetailItem>
            <DetailItem label="Method" value={transaction.method} />
            <DetailItem label="Provider" value={transaction.provider} />
            <DetailItem label="Verified" value={transaction.verified?.toString()} />
            <DetailItem label="Created At" value={formatTimestamp(transaction.createdAt)} />
            <DetailItem label="Last Updated" value={formatTimestamp(transaction.updatedAt)} />
            
            <h4 className="font-semibold text-lg mt-4 mb-2 border-b pb-1">Customer Information</h4>
            <DetailItem label="Email" value={transaction.email} />
            <DetailItem label="User ID (Auth)" value={transaction.userId} />
            
            {transaction.razorpaySignature && (
                 <h4 className="font-semibold text-lg mt-4 mb-2 border-b pb-1">Provider Specific</h4>
            )}
            <DetailItem label="Razorpay Signature" value={transaction.razorpaySignature} />

          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
