'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/users');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-full">
      <p>Redirecting to user dashboard...</p>
    </div>
  );
}
