import { NextRequest, NextResponse } from 'next/server';
import { Account, ProgramManager, AleoNetworkClient, NetworkRecordProvider } from '@provablehq/sdk';

const PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
const PROGRAM_ID = process.env.NEXT_PUBLIC_VOTING_PROGRAM_ID as string;
const NETWORK_URL = 'https://api.explorer.provable.com/v1';

// Priority fee in microcredits (0.5 credits = 500,000 microcredits for create which is heavier)
const PRIORITY_FEE_MICROCREDITS = 500_000;

export async function POST(request: NextRequest) {
  try {
    // Validate relayer is configured
    if (!PRIVATE_KEY) {
      return NextResponse.json(
        { success: false, error: 'Relayer not configured' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { cidPart1, cidPart2, startTime, endTime, optionCount, creatorAddress } = body;

    // Validate required fields
    if (!cidPart1 || !cidPart2 || !startTime || !endTime || !optionCount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('Relayer: Processing gasless campaign creation', {
      cidPart1: cidPart1.slice(0, 30) + '...',
      cidPart2: cidPart2.slice(0, 30) + '...',
      startTime,
      endTime,
      optionCount,
      creatorAddress,
    });

    // Initialize Aleo account from relayer private key
    const account = new Account({ privateKey: PRIVATE_KEY });
    console.log('Relayer address:', account.address().to_string());

    // Initialize network client
    const networkClient = new AleoNetworkClient(NETWORK_URL);

    // Initialize record provider for the relayer account
    const recordProvider = new NetworkRecordProvider(account, networkClient);

    // Initialize program manager
    const programManager = new ProgramManager(NETWORK_URL, undefined, recordProvider);
    programManager.setAccount(account);

    // Prepare inputs for create_campaign transition
    // Ensure proper formatting with type suffixes
    const inputs = [
      cidPart1.includes('field') ? cidPart1 : `${cidPart1}field`,
      cidPart2.includes('field') ? cidPart2 : `${cidPart2}field`,
      `${startTime}u64`,
      `${endTime}u64`,
      `${optionCount}u8`,
    ];

    console.log('Relayer: Executing create_campaign with inputs:', inputs);

    // Execute the transaction
    const txId = await programManager.execute({
      programName: PROGRAM_ID,
      functionName: 'create_campaign',
      inputs,
      priorityFee: PRIORITY_FEE_MICROCREDITS,
      privateFee: false,
    });

    console.log('Relayer: Transaction submitted:', txId);

    return NextResponse.json({
      success: true,
      transactionId: txId,
      message: 'Campaign created successfully via relayer',
    });

  } catch (error: any) {
    console.error('Relayer error:', error);

    // Parse error message for user-friendly response
    let errorMessage = error.message || 'Transaction failed';

    if (errorMessage.includes('insufficient')) {
      errorMessage = 'Relayer has insufficient funds. Please contact support.';
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  const isConfigured = !!PRIVATE_KEY;

  return NextResponse.json({
    status: isConfigured ? 'ready' : 'not_configured',
    programId: PROGRAM_ID,
  });
}
