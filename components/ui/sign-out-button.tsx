'use client';

import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import toast from 'react-hot-toast';

export function SignOutButton() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return; // Prevent multiple clicks
    
    setIsSigningOut(true);
    
    try {
      // Clear client-side storage first
      if (typeof window !== 'undefined') {
        // Clear all localStorage items related to Supabase
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('sb-') || key.includes('auth')) {
            localStorage.removeItem(key);
          }
        });
        
        // Clear sessionStorage
        sessionStorage.clear();
      }
      
      // Call API route to properly sign out and clear server-side cookies
      try {
        const response = await fetch('/api/auth/signout', {
          method: 'POST',
          credentials: 'include', // Important: include cookies
        });
        
        if (!response.ok) {
          console.error('Sign out API error:', response.statusText);
        }
      } catch (apiError) {
        console.error('API call error (continuing anyway):', apiError);
      }
      
      // Small delay to ensure cookies are processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Force hard redirect to sign-in page with a query param to bypass middleware redirect
      window.location.href = '/sign-in?signout=true';
      
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
      // Even on error, clear storage and redirect
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/sign-in?signout=true';
      }
    }
  };

  return (
    <Button 
      variant="ghost" 
      onClick={handleSignOut}
      disabled={isSigningOut}
    >
      {isSigningOut ? 'Signing out...' : 'Sign out'}
    </Button>
  );
}
