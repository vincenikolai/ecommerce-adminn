import { NextResponse } from 'next/server';

export async function GET() {
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "NOT_SET",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "NOT_SET",
    // Add any other critical environment variables you want to check
  };
  console.log("ENV TEST API: Environment Variables Status:", envVars);
  return NextResponse.json(envVars);
}
