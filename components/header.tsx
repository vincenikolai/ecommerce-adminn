'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { SignOutButton } from "@/components/ui/sign-out-button";

export function Header() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth, router]);

  return (
    <header className="flex items-center justify-between border-b bg-white shadow-sm px-8 py-3">
      <div className="flex items-center gap-x-3">
        <Link href="/" className="flex items-center gap-x-2">
          <Image
            src="/logo.png"
            alt="East LA Chemicals Logo"
            width={63}
            height={45}
            className="rounded"
          />
          <span className="font-semibold text-lg tracking-wide">
            East LA Chemicals
          </span>
        </Link>
      </div>
      <nav className="flex-1 flex justify-center">
        <ul className="flex gap-6 text-base font-medium items-center">
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>
            <Link href="/products">Products</Link>
          </li>
          <li>
            <Link href="/ordering">Ordering</Link>
          </li>
          <li>
            <Link href="/contact">Contact us</Link>
          </li>
          <li>
            <Link href="/reviews">Reviews</Link>
          </li>
          <li>
            <Link href="/order-history">Order History</Link>
          </li>
          <li>
            <Link href="/order-status">Order status</Link>
          </li>
          <li>
            <Link href="/order-now">
              <span className="bg-blue-500 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-600 transition-colors">
                Order now!
              </span>
            </Link>
          </li>
        </ul>
      </nav>
      <div className="flex items-center gap-x-4">
        {session ? (
          <SignOutButton />
        ) : (
          <>
            <Link href="/sign-in">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Sign up</Button>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
