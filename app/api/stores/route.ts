import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(req: Request) {
  try {
    const authClient = createRouteHandlerClient({ cookies });
    const { data: { session }, error: sessionError } = await authClient.auth.getSession();

    if (sessionError) {
      console.error("API Route - Session error:", sessionError);
      return NextResponse.json({ error: sessionError.message }, { status: 401 });
    }

    if (!session || !session.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const stores = await prismadb.store.findMany({
      where: { userId: session.user.id },
    });
    return NextResponse.json(stores);
  } catch (error) {
    console.log("[STORES_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authClient = createRouteHandlerClient({ cookies });
    const { data: { session }, error: sessionError } = await authClient.auth.getSession();

    if (sessionError) {
      console.error("API Route - Session error:", sessionError);
      return NextResponse.json({ error: sessionError.message }, { status: 401 });
    }

    if (!session || !session.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    const store = await prismadb.store.create({
      data: {
        name,
        userId: session.user.id,
      },
    });

    return NextResponse.json(store, { status: 201 });
  } catch (error) {
    console.log("[STORES_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
