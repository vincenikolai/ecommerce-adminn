import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'; // Import adminSupabase
import type { User } from '@supabase/supabase-js'; // Import User type

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {data: { session }} = await supabase.auth.getSession()

  let userDetails: User | null = session?.user || null;

  if (session && session.user && userDetails) {
    // Directly query the auth.users table for the banned_until status
    const { data: userData, error: fetchUserError } = await adminSupabase
      .from('users') // Correct table name for auth users when using admin client
      .select('banned_until')
      .eq('id', session.user.id)
      .single();

    if (fetchUserError) {
      console.error("Middleware: Error fetching banned_until from auth.users:", fetchUserError);
    } else if (userData) {
      // Only update the banned_until property
      userDetails.banned_until = userData.banned_until;
    }
  }

  const isBanned = userDetails?.banned_until && new Date(userDetails.banned_until) > new Date();
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
