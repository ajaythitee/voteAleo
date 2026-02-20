import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  programId?: string;
  explorerUrl?: string;
}

async function getSentimentAnalysis(summary: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return 'Sentiment analysis is not configured. Add GEMINI_API_KEY to enable AI-powered insights.';
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Given this voting result: ${summary}\n\nIn 2 to 4 short sentences, describe what the outcome suggests and what the public sentiment appears to be. Be neutral and factual. Do not use bullet points.`;
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    return text?.trim() || 'Unable to generate analysis.';
  } catch (err) {
    console.error('Gemini analysis error:', err);
    return 'Analysis could not be generated.';
  }
}

function getChartImageUrl(options: ReportOption[], totalVotes: number): string {
  const labels = options.map((o) => (o.label.length > 20 ? o.label.slice(0, 17) + '...' : o.label));
  const data = options.map((o) => o.votes);
  const colors = [
    'rgba(16, 185, 129, 0.8)',
    'rgba(16, 185, 129, 0.6)',
    'rgba(16, 185, 129, 0.5)',
    'rgba(16, 185, 129, 0.4)',
    'rgba(16, 185, 129, 0.3)',
  ];
  const chartConfig = {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Votes', data, backgroundColor: colors.slice(0, data.length) }],
    },
    options: {
      legend: { display: false },
      scales: {
        yAxes: [{ ticks: { beginAtZero: true } }],
      },
    },
  };
  const encoded = encodeURIComponent(JSON.stringify(chartConfig));
  return `https://quickchart.io/chart?c=${encoded}&width=500&height=280`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ReportBody;
    const {
      campaignId,
      title,
      totalVotes,
      options,
      startTime,
      endTime,
      programId = '',
      explorerUrl = '',
    } = body;

    if (!title || !options?.length) {
      return NextResponse.json(
        { error: 'Missing title or options' },
        { status: 400 }
      );
    }

    const summary = `Campaign: "${title}". Total votes: ${totalVotes}. Results: ${options.map((o) => `${o.label}: ${o.votes} (${o.percentage ?? 0}%)`).join('; ')}.`;
    const analysis = await getSentimentAnalysis(summary);

    const chartUrl = getChartImageUrl(options, totalVotes);
    let chartBase64: string | null = null;
    try {
      const chartRes = await fetch(chartUrl);
      if (chartRes.ok) {
        const ab = await chartRes.arrayBuffer();
        chartBase64 = Buffer.from(ab).toString('base64');
      }
    } catch {
      // continue without chart image
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.getPageWidth();
    const margin = 20;
    let y = 20;

    // Header - Privote
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Privote', margin, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Campaign Report', margin, 24);
    y = 36;

    // Campaign title
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title.length > 60 ? title.slice(0, 57) + '...' : title, margin, y);
    y += 10;

    // Date range
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Voting period: ${startTime} — ${endTime}`, margin, y);
    y += 8;
    doc.text(`Total votes: ${totalVotes}`, margin, y);
    y += 14;

    // Results table
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Results', margin, y);
    y += 6;

    const tableData = options.map((o) => [
      o.label.length > 50 ? o.label.slice(0, 47) + '...' : o.label,
      String(o.votes),
      `${o.percentage ?? 0}%`,
    ]);
    autoTable(doc, {
      startY: y,
      head: [['Option', 'Votes', 'Share']],
      body: tableData,
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
    y = (doc as any).lastAutoTable.finalY + 14;

    // Chart image
    if (chartBase64 && y < 220) {
      try {
        doc.addImage(`data:image/png;base64,${chartBase64}`, 'PNG', margin, y, pageW - 2 * margin, 50);
        y += 58;
      } catch {
        y += 5;
      }
    }

    if (y > 240) doc.addPage();
    else y += 10;

    // What the results suggest
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('What the results suggest', margin, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    const splitAnalysis = doc.splitTextToSize(analysis, pageW - 2 * margin);
    doc.text(splitAnalysis, margin, y);
    y += splitAnalysis.length * 5 + 14;

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Report generated by Privote • Campaign #${campaignId}`, margin, y);
    if (programId) doc.text(`Program: ${programId}`, margin, y + 5);
    if (explorerUrl) doc.text(`Verify on-chain: ${explorerUrl}`, margin, y + 10);

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    const filename = `privote-campaign-${campaignId}-report.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (err) {
    console.error('Report generation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Report generation failed' },
      { status: 500 }
    );
  }
}
