import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderKanban } from 'lucide-react';
import Image from 'next/image';

export default function CategoriesPage() {
  return (
    <>
      <PageHeader
        title="Categories"
        description="Manage product categories for your shop."
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-primary" />
            <span>Category Management</span>
          </CardTitle>
          <CardDescription>
            This section is currently under development. Functionality to add, edit, and delete categories will be available soon.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center p-10">
          <Image 
            src="https://placehold.co/400x300.png" 
            alt="Under Construction" 
            width={400} 
            height={300} 
            className="rounded-lg mb-6 opacity-80"
            data-ai-hint="construction gears" 
          />
          <h3 className="text-xl font-semibold text-foreground mb-2">Coming Soon!</h3>
          <p className="text-muted-foreground max-w-md">
            We are working hard to bring you a comprehensive category management system. 
            Stay tuned for updates!
          </p>
        </CardContent>
      </Card>
    </>
  );
}
