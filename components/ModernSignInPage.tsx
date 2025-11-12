'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

export function ModernSignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const supabase = createClientComponentClient();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'banned') {
      toast.error("Your account has been blocked. Please contact support.");
    }
  }, [searchParams]);

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Error signing in:", error.message, error);
      
      // Handle rate limit error specifically
      if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
        toast.error(
          "Too many sign-in attempts. Please wait a few minutes before trying again.",
          { duration: 5000 }
        );
      } else {
        toast.error("Error signing in: " + error.message);
      }
    } else {
      // After successful sign-in, check ban status immediately
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const response = await fetch('/api/check-ban-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        });
        const { ban_duration } = await response.json();

        if (ban_duration === 'blocked') {
          toast.error("Your account has been blocked. Please contact support.");
          await supabase.auth.signOut(); // Sign out the banned user immediately
          router.refresh(); // Refresh to update session state
        } else {
          router.replace('/');
          router.refresh();
        }
      }
    }
  };

  return (
    <div className="flex flex-col space-y-4 w-full max-w-sm">
      <h1 className="text-3xl font-bold text-center">Sign In</h1>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="m@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" onClick={handleSignIn}>
        Sign In
      </Button>
      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="underline">
          Sign Up
        </Link>
      </p>
    </div>
  );
}
