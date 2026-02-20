import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Gasless relayer has been disabled. Please use wallet-based transactions with your Aleo wallet.',
    },
    { status: 503 },
  );
}

