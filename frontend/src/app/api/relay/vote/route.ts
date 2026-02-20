import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Gasless relayer has been disabled. Please submit votes directly via your Aleo wallet.',
    },
    { status: 503 },
  );
}

