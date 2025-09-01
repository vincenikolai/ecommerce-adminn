import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'; // Import adminSupabase

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Ensure adminSupabase is available for server-side operations
  if (!adminSupabase) {
    console.error("Middleware: adminSupabase client is not initialized!");
    // Potentially redirect to an error page or deny access if critical client is missing
  }

  const {data: { session }} = await supabase.auth.getSession()

  let userDetails = session?.user;

  if (session && session.user) {
    // Fetch the latest user details from Supabase admin to ensure banned_until is current
    const { data: { user }, error: adminUserError } = await adminSupabase.auth.admin.getUserById(session.user.id);

    if (adminUserError) {
      console.error("Middleware: Error fetching admin user details from adminSupabase:", adminUserError);
      // Continue with potentially stale session user data if admin fetch fails
    } else if (user) {
      console.log("Middleware: Successfully fetched User Details from adminSupabase:", user);
      userDetails = user;
    }
  }

  console.log("Middleware: Final userDetails for ban check:", userDetails);
  const isBanned = userDetails?.banned_until && new Date(userDetails.banned_until) > new Date();
  console.log("Middleware: Is Banned calculated:", isBanned);
  const isSignInPage = req.nextUrl.pathname.startsWith('/sign-in');
  const isDashboardRoute = req.nextUrl.pathname.startsWith('/dashboard');

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

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)(.+)']
}
