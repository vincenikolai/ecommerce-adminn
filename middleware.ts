import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'; // Import adminSupabase
import type { User } from '@supabase/supabase-js'; // Import User type

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {data: { session }} = await supabase.auth.getSession()

  interface UserWithBanStatus extends User {
    ban_duration?: string | null;
  }

  let userDetails: UserWithBanStatus | null = session?.user || null;

  if (session && session.user && userDetails) {
    // Fetch the user's profile from the profiles table to get ban_duration and role
    const { data: profileData, error: profileError } = await adminSupabase
      .from('profiles')
      .select('ban_duration, role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error("Middleware: Error fetching profile for ban status and role:", profileError);
    } else if (profileData) {
      userDetails.ban_duration = profileData.ban_duration;
      (userDetails as any).role = profileData.role; // Add role to userDetails
      console.log("Middleware: Fetched ban_duration and role from profiles:", profileData.ban_duration, profileData.role);
    }
  }

  const isBanned = userDetails?.ban_duration === 'blocked'; // Check against ban_duration
  const isSignInPage = req.nextUrl.pathname.startsWith('/sign-in');
  const isDashboardRoute = req.nextUrl.pathname.startsWith('/dashboard');
  const isPurchaseInvoiceManagerRoute = req.nextUrl.pathname.startsWith('/dashboard/purchase-invoice-manager');

  if (isBanned) {
    // If user is banned, and not already on sign-in page with banned error
    if (!isSignInPage || req.nextUrl.searchParams.get('error') !== 'banned') {
      const redirectUrl = new URL('/sign-in', req.url);
      redirectUrl.searchParams.set('error', 'banned');
      // Sign out the user if they are banned and try to access a protected route
      await supabase.auth.signOut();
      return NextResponse.redirect(redirectUrl);
    }
    // If already on sign-in page with banned error, allow it but ensure no active session
    if (session) {
      await supabase.auth.signOut();
    }
    return res; // Allow access to sign-in page with the error message
  }

  if (!session && isDashboardRoute) {
    // Redirect unauthenticated users trying to access dashboard routes
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  if (session && (isSignInPage || req.nextUrl.pathname.startsWith('/sign-up'))) {
    // Redirect authenticated users trying to access sign-in/sign-up pages
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Role-based access control for Purchase Invoice Manager
  if (isPurchaseInvoiceManagerRoute) {
    const userRole = (userDetails as any)?.role;
    if (!session || (userRole !== 'finance_manager' && userRole !== 'admin')) {
      console.log(`Middleware: Unauthorized access attempt to ${req.nextUrl.pathname} by role: ${userRole}`);
      return NextResponse.redirect(new URL('/', req.url)); // Redirect to home or an unauthorized page
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)(.+)', '/dashboard/purchase-invoice-manager/:path*']
}
