'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export function ModernSignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Error signing in:", error.message);
      alert("Error signing in: " + error.message);
    } else {
      router.replace('/dashboard');
      router.refresh();
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
        Don't have an account?{" "}
        <Link href="/sign-up" className="underline">
          Sign Up
        </Link>
      </p>
    </div>
  );
}
