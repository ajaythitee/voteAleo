import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface ReportOption {
  label: string;
  votes: number;
  percentage?: number;
}

interface ReportBody {
  campaignId: string | number;
  title: string;
  totalVotes: number;
  options: ReportOption[];
  startTime: string;
  endTime: string;
  creator?: string;
  programId?: string;
  explorerUrl?: string;
}

interface AnalysisResult {
  summary: string;
  insights: string;
  sentiment: string;
  voterFeelings: string;
}

async function generateAIAnalysis(
  title: string,
  totalVotes: number,
  options: ReportOption[],
  startTime: string,
  endTime: string
): Promise<AnalysisResult> {
  const geminiApiKey = process.env.GEMINI_API_KEY;

  const fallback: AnalysisResult = {
    summary: 'AI analysis is not configured. Add GEMINI_API_KEY to generate a narrative summary for this report.',
    insights: 'Once Gemini is configured, this section will highlight turnout patterns, leading preferences, and notable result signals.',
    sentiment: 'Neutral',
    voterFeelings: 'This section will estimate participant sentiment using the final vote distribution once Gemini is enabled.',
  };

  if (!geminiApiKey) {
    return fallback;
  }

  const optionsText = options
    .map((option, index) => `${index + 1}. "${option.label}": ${option.votes} votes (${option.percentage ?? 0}%)`)
    .join('\n');

  const prompt = `You are analyzing the outcome of a privacy-preserving voting campaign.

Campaign Title: "${title}"
Total Votes: ${totalVotes}
Voting Period: ${startTime} to ${endTime}

Results:
${optionsText}

Return valid JSON with exactly these keys:
{
  "summary": "2-3 sentence executive summary",
  "insights": "3-4 sentence explanation of notable patterns and what they suggest",
  "sentiment": "One word: Positive, Negative, Neutral, or Mixed",
  "voterFeelings": "4-5 sentence estimate of what participants may be feeling based on the results"
}

Be factual, neutral, professional, and avoid platform branding.`;

  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.55,
        topP: 0.9,
        topK: 40,
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
    const parsed = JSON.parse(jsonText);

    return {
      summary: String(parsed.summary || fallback.summary),
      insights: String(parsed.insights || fallback.insights),
      sentiment: String(parsed.sentiment || fallback.sentiment),
      voterFeelings: String(parsed.voterFeelings || fallback.voterFeelings),
    };
  } catch (error) {
    console.error('Gemini analysis error:', error);
    return fallback;
  }
}

function getChartImageUrl(options: ReportOption[]): string {
  const labels = options.map((option) =>
    option.label.length > 25 ? `${option.label.slice(0, 22)}...` : option.label
  );
  const data = options.map((option) => option.votes);
  const colors = [
    'rgba(20, 184, 166, 0.88)',
    'rgba(59, 130, 246, 0.88)',
    'rgba(245, 158, 11, 0.88)',
    'rgba(244, 114, 182, 0.88)',
    'rgba(99, 102, 241, 0.88)',
  ];

  const chartConfig = {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.slice(0, data.length),
          borderColor: colors.slice(0, data.length).map((color) => color.replace('0.88', '1')),
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: 'right',
          labels: {
            color: '#334155',
            boxWidth: 14,
            padding: 14,
            font: { size: 12 },
          },
        },
      },
      layout: { padding: 16 },
      cutout: '56%',
      elements: {
        arc: {
          borderWidth: 3,
        },
      },
    },
  };

  const encoded = encodeURIComponent(JSON.stringify(chartConfig));
  return `https://quickchart.io/chart?c=${encoded}&width=900&height=420&format=png&backgroundColor=white`;
}

async function fetchChartImage(chartUrl: string): Promise<string | null> {
  try {
    const response = await fetch(chartUrl, {
      headers: {
        'User-Agent': 'VoteAleo-Report-Generator/1.0',
      },
    });

    if (!response.ok) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  } catch (error) {
    console.error('Chart image fetch error:', error);
    return null;
  }
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

function formatAddress(address: string | undefined): string {
  if (!address) return 'Not available';
  if (address.length <= 20) return address;
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

function getLogoBase64(): string | null {
  try {
    const logoPath = join(process.cwd(), 'public', 'logo.svg');
    return `data:image/svg+xml;base64,${Buffer.from(readFileSync(logoPath, 'utf-8')).toString('base64')}`;
  } catch {
    try {
      const altPath = join(process.cwd(), 'frontend', 'public', 'logo.svg');
      return `data:image/svg+xml;base64,${Buffer.from(readFileSync(altPath, 'utf-8')).toString('base64')}`;
    } catch {
      return null;
    }
  }
}

function drawPageBackground(doc: jsPDF, pageW: number, pageH: number) {
  doc.setFillColor(246, 248, 252);
  doc.rect(0, 0, pageW, pageH, 'F');

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 46, 'F');

  doc.setFillColor(20, 184, 166);
  doc.circle(pageW - 18, 14, 16, 'F');
  doc.setFillColor(59, 130, 246);
  doc.circle(pageW - 8, 34, 12, 'F');
  doc.setFillColor(251, 191, 36);
  doc.circle(pageW - 42, 8, 9, 'F');
}

function drawStatCard(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string,
  accent: [number, number, number]
) {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(220, 228, 238);
  doc.roundedRect(x, y, width, height, 4, 4, 'FD');
  doc.setFillColor(...accent);
  doc.roundedRect(x + 3, y + 3, 5, height - 6, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(label, x + 12, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(value, x + 12, y + 15);
}

function drawAnalysisCard(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  title: string,
  body: string,
  accent: [number, number, number]
) {
  const lines = doc.splitTextToSize(body, width - 12);
  const headerH = 12;
  const height = headerH + 9 + lines.length * 4.5 + 8;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(220, 228, 238);
  doc.roundedRect(x, y, width, height, 4, 4, 'FD');
  doc.setFillColor(...accent);
  // Full-height colored header band (avoid masking the lower half, which can look "cut off").
  doc.roundedRect(x, y, width, headerH, 4, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(title, x + 6, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(lines, x + 6, y + headerH + 6);

  return height;
}

function getAnalysisCardHeight(doc: jsPDF, width: number, body: string) {
  const lines = doc.splitTextToSize(body, width - 12);
  const headerH = 12;
  return headerH + 9 + lines.length * 4.5 + 8;
}

function ensureSpace(doc: jsPDF, pageW: number, pageH: number, y: number, neededHeight: number) {
  if (y + neededHeight <= pageH - 24) {
    return y;
  }

  doc.addPage();
  drawPageBackground(doc, pageW, pageH);
  return 20;
}

function generatePDF(
  campaignId: string | number,
  title: string,
  totalVotes: number,
  options: ReportOption[],
  startTime: string,
  endTime: string,
  analysis: AnalysisResult,
  chartBase64: string | null,
  creator: string | undefined,
  programId: string
): ArrayBuffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = (doc as any).internal?.pageSize?.getWidth?.() ?? 210;
  const pageH = (doc as any).internal?.pageSize?.getHeight?.() ?? 297;
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 56;

  drawPageBackground(doc, pageW, pageH);
  doc.setTextColor(255, 255, 255);

  const logoBase64 = getLogoBase64();
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'SVG', margin, 8, 16, 16);
    } catch (error) {
      console.warn('Could not add logo image:', error);
    }
  }

  const logoOffset = logoBase64 ? 20 : 0;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('Private Voting with VeilProtocol', margin + logoOffset, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Campaign summary, result breakdown, and voter sentiment', margin + logoOffset, 27);
  doc.setFontSize(9);
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    pageW - margin,
    27,
    { align: 'right' }
  );

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(220, 228, 238);
  doc.roundedRect(margin, y, contentW, 34, 7, 7, 'FD');
  doc.setFillColor(20, 184, 166);
  doc.roundedRect(margin + 4, y + 4, 6, 26, 3, 3, 'F');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(title.length > 70 ? `${title.slice(0, 67)}...` : title, contentW - 20);
  doc.text(titleLines, margin + 16, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Campaign ID #${campaignId}`, margin + 16, y + 21);
  doc.text(`Voting window: ${formatDate(startTime)} to ${formatDate(endTime)}`, margin + 16, y + 27);
  y += 44;

  const leadingOption = options.reduce<ReportOption | null>((best, option) => {
    if (!best || option.votes > best.votes) return option;
    return best;
  }, null);

  drawStatCard(doc, margin, y, 52, 20, 'Turnout', totalVotes === 0 ? 'No votes yet' : `${totalVotes} votes`, [20, 184, 166]);
  drawStatCard(
    doc,
    margin + 58,
    y,
    52,
    20,
    'Leading option',
    leadingOption ? `${leadingOption.label.slice(0, 18)}${leadingOption.label.length > 18 ? '...' : ''}` : 'None',
    [59, 130, 246]
  );
  drawStatCard(doc, margin + 116, y, 54, 20, 'Creator', formatAddress(creator), [245, 158, 11]);
  y += 30;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('Results Overview', margin, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [['Option', 'Votes', 'Share']],
    body: options.map((option, index) => [
      `${index + 1}. ${option.label.length > 45 ? `${option.label.slice(0, 42)}...` : option.label}`,
      String(option.votes),
      `${option.percentage ?? 0}%`,
    ]),
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 11,
    },
    bodyStyles: {
      fontSize: 10,
      textColor: [30, 30, 30],
    },
    alternateRowStyles: {
      fillColor: [244, 247, 251],
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 30, halign: 'center' },
    },
    styles: {
      lineColor: [229, 231, 235],
      lineWidth: 0.5,
    },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  if (chartBase64 && y < 200) {
    try {
      const chartHeight = 78;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(220, 228, 238);
      doc.roundedRect(margin, y - 4, contentW, chartHeight + 10, 6, 6, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('Vote Distribution', margin + 6, y + 2);
      doc.addImage(`data:image/png;base64,${chartBase64}`, 'PNG', margin + 5, y + 5, contentW - 10, chartHeight - 4);
      y += chartHeight + 12;
    } catch (error) {
      console.error('Chart image error:', error);
    }
  }

  if (y > 240) {
    doc.addPage();
    drawPageBackground(doc, pageW, pageH);
    y = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('Gemini Narrative Analysis', margin, y);
  y += 8;

  y = ensureSpace(doc, pageW, pageH, y, getAnalysisCardHeight(doc, contentW, analysis.summary) + 6);
  y += drawAnalysisCard(doc, margin, y, contentW, 'Executive Summary', analysis.summary, [20, 184, 166]) + 6;
  y = ensureSpace(doc, pageW, pageH, y, getAnalysisCardHeight(doc, contentW, analysis.insights) + 6);
  y += drawAnalysisCard(doc, margin, y, contentW, 'Key Insights', analysis.insights, [59, 130, 246]) + 6;
  y = ensureSpace(doc, pageW, pageH, y, getAnalysisCardHeight(doc, contentW, analysis.voterFeelings) + 8);
  y += drawAnalysisCard(doc, margin, y, contentW, 'Voter Sentiment Signals', analysis.voterFeelings, [245, 158, 11]) + 8;

  const sentimentColors: Record<string, [number, number, number]> = {
    Positive: [16, 185, 129],
    Negative: [239, 68, 68],
    Neutral: [107, 114, 128],
    Mixed: [251, 146, 60],
  };
  const sentimentColor = sentimentColors[analysis.sentiment] || [107, 114, 128];
  doc.setFillColor(...sentimentColor);
  doc.roundedRect(margin, y - 4, 42, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Sentiment: ${analysis.sentiment}`, margin + 2, y + 2);
  y += 14;

  y = ensureSpace(doc, pageW, pageH, y, 40);

  doc.setDrawColor(229, 231, 235);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Report Notes', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('This PDF summarizes the final tally, option share, and AI-generated interpretation of the result.', margin, y);
  y += 6;

  if (creator) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Campaign Owner:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(formatAddress(creator), margin, y);
    y += 8;
  }

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated report - Campaign #${campaignId}`, margin, y);
  y += 4;

  if (programId) {
    doc.text(`Program ID: ${programId}`, margin, y);
    y += 4;
  }

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Prepared for post-campaign review and record-keeping.', margin, y + 4);

  return doc.output('arraybuffer') as ArrayBuffer;
}

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();

  try {
    const body = (await request.json()) as ReportBody;
    const {
      campaignId,
      title,
      totalVotes,
      options,
      startTime,
      endTime,
      creator,
      programId = '',
    } = body;

    if (!title || !options?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: title and options are required' },
        { status: 400 }
      );
    }

    if (totalVotes < 0) {
      return NextResponse.json({ error: 'Invalid total votes count' }, { status: 400 });
    }

    try {
      if (new Date(endTime) > new Date()) {
        return NextResponse.json(
          { error: 'Report can only be generated after the campaign ends' },
          { status: 400 }
        );
      }
    } catch (error) {
      console.warn('Could not validate end time:', error);
    }

    const [chartBase64, analysis] = await Promise.all([
      fetchChartImage(getChartImageUrl(options)),
      generateAIAnalysis(title, totalVotes, options, startTime, endTime),
    ]);

    const pdfArrayBuffer = generatePDF(
      campaignId,
      title,
      totalVotes,
      options,
      startTime,
      endTime,
      analysis,
      chartBase64,
      creator,
      programId
    );

    const generationTime = Date.now() - requestStartTime;
    const filename = `votealeo-campaign-${campaignId}-report.pdf`;
    const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });

    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfArrayBuffer.byteLength),
        'X-Generation-Time': String(generationTime),
      },
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      {
        error: 'Report generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
