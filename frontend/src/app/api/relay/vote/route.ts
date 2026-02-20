import { NextRequest, NextResponse } from 'next/server';
import { Account, ProgramManager, AleoNetworkClient, NetworkRecordProvider } from '@provablehq/sdk';

const PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
const PROGRAM_ID = process.env.NEXT_PUBLIC_VOTING_PROGRAM_ID as string;
const NETWORK_URL = 'https://api.explorer.provable.com/v1';

// Priority fee in microcredits (0.3 credits = 300,000 microcredits)
const PRIORITY_FEE_MICROCREDITS = 300_000;

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
    const { campaignId, optionIndex, voterAddress, signature, timestamp } = body;

    // Validate required fields
    if (campaignId === undefined || optionIndex === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: campaignId, optionIndex' },
        { status: 400 }
      );
    }

    console.log('Relayer: Processing gasless vote', {
      campaignId,
      optionIndex,
      voterAddress,
      timestamp,
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

    // Prepare inputs for cast_vote transition
    const voteTimestamp = timestamp || Math.floor(Date.now() / 1000);
    const inputs = [
      `${campaignId}u64`,
      `${optionIndex}u8`,
      `${voteTimestamp}u64`,
    ];

    console.log('Relayer: Executing cast_vote with inputs:', inputs);

    // Execute the transaction
    const txId = await programManager.execute({
      programName: PROGRAM_ID,
      functionName: 'cast_vote',
      inputs,
      priorityFee: PRIORITY_FEE_MICROCREDITS,
      privateFee: false,
    });

    console.log('Relayer: Transaction submitted:', txId);

    return NextResponse.json({
      success: true,
      transactionId: txId,
      message: 'Vote submitted successfully via relayer',
    });

  } catch (error: any) {
    console.error('Relayer error:', error);

    // Parse error message for user-friendly response
    let errorMessage = error.message || 'Transaction failed';

    if (errorMessage.includes('insufficient')) {
      errorMessage = 'Relayer has insufficient funds. Please contact support.';
    } else if (errorMessage.includes('already voted')) {
      errorMessage = 'You have already voted in this campaign.';
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

  let relayerAddress = null;
  if (isConfigured && PRIVATE_KEY) {
    try {
      const account = new Account({ privateKey: PRIVATE_KEY });
      relayerAddress = account.address().to_string();
    } catch (e) {
      // Invalid private key
    }
  }

  return NextResponse.json({
    status: isConfigured ? 'ready' : 'not_configured',
    programId: PROGRAM_ID,
    relayerAddress,
  });
}
