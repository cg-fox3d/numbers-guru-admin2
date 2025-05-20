import type { ReactNode } from 'react';
import { AdminLayoutContent } from '@/components/layout/AdminLayoutContent';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutContent>{children}</AdminLayoutContent>;
}
