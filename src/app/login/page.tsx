
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { FullScreenLoader } from '@/components/common/FullScreenLoader';

export default function LoginPage() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <LoginForm />
    </Suspense>
  );
}
