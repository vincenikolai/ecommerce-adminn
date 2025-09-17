import { NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { UserRole } from '@/types/user';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL; // Define admin email if needed for fallback access
const FINANCE_MANAGER_ROLE: UserRole = "finance_manager";

export async function GET(req: Request) {
  try {
    let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    let supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error('Missing environment variables for Supabase admin client in API route');
    }

    const localAdminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            persistSession: false,
        },
    });

    const authClient = createRouteHandlerClient({ cookies });
    const { data: { session }, error: sessionError } = await authClient.auth.getSession();

    if (sessionError) {
        console.error("API Route - Session error:", sessionError);
        return NextResponse.json({ error: sessionError.message }, { status: 401 });
    }

    if (!session || !session.user?.id) {
        console.error("API Route - Access Denied: No active session or user ID.");
        return NextResponse.json({ error: "Access Denied: No active session or user ID." }, { status: 403 });
    }

    // Fetch the user's role from the profiles table
    const { data: profile, error: profileError } = await localAdminSupabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (profileError) {
        console.error("API Route - Error fetching user profile:", profileError);
        return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Check if the user has the required role
    if (profile?.role !== FINANCE_MANAGER_ROLE && profile?.role !== "admin") {
        return new NextResponse("Unauthorized: You do not have permission to view purchase invoices.", { status: 403 });
    }

    const purchaseInvoices = await prismadb.purchaseInvoice.findMany({
      include: {
        supplier: true,
        purchaseOrder: true,
        receivingReport: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(purchaseInvoices);
  } catch (error: unknown) {
    console.error('[PURCHASE_INVOICE_GET]', error);
    // Provide a more descriptive error message in development or if an instance of Error
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return new NextResponse(errorMessage, { status: 500 });
  }
}
