import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { UserRole } from '@/types/user';

import prismadb from '@/lib/prismadb';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL; // Define admin email if needed for fallback access
const FINANCE_MANAGER_ROLE: UserRole = "finance_manager";

export async function PATCH(req: Request) {
  try {
    const body = await req.json();

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
        return new NextResponse("Unauthorized: You do not have permission to update purchase invoices.", { status: 403 });
    }

    const { 
      id,
      invoiceNumber, 
      supplierId, 
      poReferenceNumber, 
      receivingReportReferenceNumber, 
      invoiceDate, 
      dueDate, 
      materials, 
      paymentTerms, 
      paymentStatus 
    } = body;

    if (!id) {
        return new NextResponse("Purchase Invoice ID is required", { status: 400 });
    }

    if (!invoiceNumber) {
      return new NextResponse("Invoice number is required", { status: 400 });
    }

    if (!supplierId) {
      return new NextResponse("Supplier ID is required", { status: 400 });
    }

    if (!poReferenceNumber) {
      return new NextResponse("PO Reference Number is required", { status: 400 });
    }

    if (!receivingReportReferenceNumber) {
      return new NextResponse("Receiving Report Reference Number is required", { status: 400 });
    }

    if (!invoiceDate) {
      return new NextResponse("Invoice Date is required", { status: 400 });
    }

    if (!dueDate) {
      return new NextResponse("Due Date is required", { status: 400 });
    }

    if (!paymentStatus) {
      return new NextResponse("Payment Status is required", { status: 400 });
    }

    const purchaseInvoice = await prismadb.purchaseInvoice.update({
      where: {
        id,
      },
      data: {
        invoiceNumber,
        supplierId,
        poReferenceNumber,
        receivingReportReferenceNumber,
        invoiceDate,
        dueDate,
        materials,
        paymentTerms,
        paymentStatus,
      },
    });

    return NextResponse.json(purchaseInvoice);
  } catch (error) {
    console.log('[PURCHASE_INVOICE_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
