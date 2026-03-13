import { NextResponse } from 'next/server';
import { aleoService } from '@/services/aleo';

export const dynamic = 'force-dynamic';

export async function GET() {
  const programId = aleoService.getProgramId();
  const rpcUrl = aleoService.getRpcUrl();
  const network = aleoService.getNetwork();

  try {
    const campaignCount = await aleoService.getCampaignCount();
    let campaign1: unknown = 'not_found';
    try {
      const data = await aleoService.fetchCampaign(1);
      if (data != null) campaign1 = data;
    } catch {
      // keep campaign1 as not_found
    }

    return NextResponse.json({
      ok: true,
      programId,
      rpcUrl,
      network,
      campaignCount,
      campaign1,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        error: message,
        programId,
        rpcUrl,
        network,
      },
      { status: 500 }
    );
  }
}
