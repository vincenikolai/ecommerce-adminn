import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error signing out:', error);
      // Continue anyway to clear cookies
    }
    
    // Create response and clear all auth cookies
    const response = NextResponse.json({ message: 'Signed out successfully' });
    
    // Get all cookies and clear Supabase-related ones
    const allCookies = cookieStore.getAll();
    
    // Clear all cookies that might be related to Supabase auth
    allCookies.forEach(cookie => {
      const name = cookie.name;
      // Delete any cookie that might be related to auth/session
      if (
        name.includes('supabase') || 
        name.includes('sb-') || 
        name.includes('auth') ||
        name.includes('access-token') ||
        name.includes('refresh-token')
      ) {
        response.cookies.set(name, '', {
          expires: new Date(0),
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
      }
    });
    
    // Also try to clear common Supabase cookie patterns
    const commonCookieNames = [
      'sb-access-token',
      'sb-refresh-token',
      'supabase.auth.token',
    ];
    
    commonCookieNames.forEach(name => {
      response.cookies.set(name, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    });
    
    return response;
  } catch (error) {
    console.error('Unexpected error during sign out:', error);
    return NextResponse.json(
      { error: 'Failed to sign out' },
      { status: 500 }
    );
  }
}

