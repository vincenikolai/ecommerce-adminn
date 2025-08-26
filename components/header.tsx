import { Button } from "@/components/ui/button";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image"; // ✅ import Image

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b px-4">
      <Link href="/" className="flex items-center gap-x-4">
        {/* Logo */}
        <Image
          src="/logo.png" // ✅ path relative to /public
          alt="East LA Chemicals Logo"
          width={63}
          height={45}
          className="rounded" // optional styling
        />
        {/* Company name */}
        <span className="font-semibold">East LA Chemicals</span>
      </Link>

      <div className="flex items-center gap-x-4">
        <SignedOut>
          <SignInButton mode="modal">
            <Button variant="ghost">Sign in</Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button>Sign up</Button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </header>
  );
}
