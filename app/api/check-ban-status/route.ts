import { adminSupabase } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return new NextResponse('User ID is required', { status: 400 });
    }

    const { data: profileData, error: profileError } = await adminSupabase
      .from('profiles')
      .select('ban_duration')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('API: Error fetching ban status from profiles:', profileError);
      return new NextResponse(profileError.message, { status: 500 });
    }

    return NextResponse.json({ ban_duration: profileData?.ban_duration || null });
  } catch (error: unknown) {
    console.error('API: Unexpected error in check-ban-status route:', error);
    return new NextResponse(error instanceof Error ? error.message : 'Internal Server Error', { status: 500 });
  }
}

