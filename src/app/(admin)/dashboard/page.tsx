import { PageHeader } from '@/components/common/PageHeader';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="Welcome back, Admin! Here's an overview of your VIP number shop." />
      <DashboardOverview />
    </>
  );
}
