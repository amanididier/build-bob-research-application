import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** Legacy better-auth route stub. Web auth uses Supabase at /sign-in. */
export async function GET() {
  return NextResponse.json(
    { ok: false, message: 'Use /sign-in with Supabase auth.' },
    { status: 410 }
  )
}

export async function POST() {
  return NextResponse.json(
    { ok: false, message: 'Use /sign-in with Supabase auth.' },
    { status: 410 }
  )
}
