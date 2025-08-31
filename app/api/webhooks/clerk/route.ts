import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { Webhook } from "svix";

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  // Get the ID and type
  const { id } = evt.data;
  const eventType = evt.type;

  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    const email = email_addresses[0]?.email_address;

    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: id,
          email: email,
          first_name: first_name,
          last_name: last_name,
          image_url: image_url,
        },
        { onConflict: "id" }
      )
      .select();

    if (error) {
      console.error("Error upserting user to Supabase:", error);
      return new Response("Error upserting user", { status: 500 });
    }
    console.log("Supabase upsert success:", data);
  } else if (eventType === "user.deleted") {
    const { id } = evt.data;

    const { error } = await supabase.from("profiles").delete().eq("id", id);

    if (error) {
      console.error("Error deleting user from Supabase:", error);
      return new Response("Error deleting user", { status: 500 });
    }
    console.log("Supabase delete success for user:", id);
  }

  return new Response("");
}

