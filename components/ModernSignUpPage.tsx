'use client';

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import Link from "next/link";

export function ModernSignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClientComponentClient();

  const isSignInPage = pathname.includes('sign-in');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSignInPage) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Signed in successfully!");
          router.push('/'); // Redirect to homepage
          router.refresh();
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${location.origin}/auth/callback`,
            data: {
              first_name: firstName,
              last_name: lastName,
            },
          },
        });

        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Sign up successful! Check your email for a confirmation link.");
          router.push('/'); // Redirect to homepage
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-6">{isSignInPage ? "Sign In" : "Sign Up"}</h1>
      <form onSubmit={handleAuth} className="w-full max-w-sm space-y-4">
        {!isSignInPage && (
          <>
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </>
        )}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full">
          {isSignInPage ? "Sign In" : "Sign Up"}
        </Button>
      </form>
      <div className="mt-4 text-sm">
        {isSignInPage ? (
          <p>
            Don't have an account?{" "}
            <Link href="/sign-up" className="text-blue-500 hover:underline">
              Sign Up
            </Link>
          </p>
        ) : (
          <p>
            Already have an account?{" "}
            <Link href="/sign-in" className="text-blue-500 hover:underline">
              Sign In
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
