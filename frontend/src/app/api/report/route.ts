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

/**
 * Generate comprehensive AI analysis using Groq (preferred) or Gemini Flash 2.0
 */
async function generateAIAnalysis(
  title: string,
  totalVotes: number,
  options: ReportOption[],
  startTime: string,
  endTime: string
): Promise<AnalysisResult> {
  const groqApiKey = process.env.GROQ_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  // Default fallback response
  const fallback: AnalysisResult = {
    summary: 'AI analysis is not configured. Add GROQ_API_KEY or GEMINI_API_KEY to enable AI-powered insights.',
    insights: 'Enable AI API keys to get detailed campaign analysis and voter sentiment insights.',
    sentiment: 'Neutral',
    voterFeelings: 'Enable AI analysis to understand voter sentiment and feelings about this campaign.',
  };

  if (!groqApiKey && !geminiApiKey) {
    return fallback;
  }

  const optionsText = options
      .map((o, idx) => `${idx + 1}. "${o.label}": ${o.votes} votes (${o.percentage ?? 0}%)`)
      .join('\n');

  const prompt = `You are analyzing a voting campaign report for VeilProtocol, a privacy-preserving governance platform on Aleo blockchain.

Campaign Title: "${title}"
Total Votes: ${totalVotes}
Voting Period: ${startTime} to ${endTime}

Results:
${optionsText}

Provide a comprehensive analysis in JSON format with these exact keys:
{
  "summary": "A 2-3 sentence executive summary of the voting outcome and key findings",
  "insights": "3-4 sentences describing what patterns emerge, what this suggests about voter preferences, and any notable trends",
  "sentiment": "One word: Positive, Negative, Neutral, or Mixed - describing overall voter sentiment",
  "voterFeelings": "4-5 sentences analyzing what voters are feeling about this campaign - their concerns, enthusiasm, satisfaction, or dissatisfaction based on the voting patterns and distribution"
}

Be factual, neutral, and professional. Focus on data-driven observations and voter psychology.`;

  // Try Groq first (faster and cheaper)
  if (groqApiKey) {
    try {
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile', // Fast and capable model
          messages: [
            {
              role: 'system',
              content: 'You are an expert data analyst specializing in governance and voting behavior. Provide accurate, professional analysis in JSON format.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 800,
          response_format: { type: 'json_object' },
        }),
      });

      if (groqResponse.ok) {
        const groqData = await groqResponse.json();
        const content = groqData.choices?.[0]?.message?.content;
        
        if (content) {
          try {
            const parsed = JSON.parse(content);
            return {
              summary: parsed.summary || fallback.summary,
              insights: parsed.insights || fallback.insights,
              sentiment: parsed.sentiment || 'Neutral',
              voterFeelings: parsed.voterFeelings || fallback.voterFeelings,
            };
          } catch {
            // Fallback: treat as text
            const text = content.slice(0, 1000);
            return {
              summary: text.slice(0, 200) || fallback.summary,
              insights: text.slice(200, 500) || fallback.insights,
              sentiment: 'Neutral',
              voterFeelings: text.slice(500) || fallback.voterFeelings,
            };
          }
        }
      }
    } catch (err) {
      console.error('Groq analysis error:', err);
      // Fall through to Gemini
    }
  }

  // Fallback to Gemini Flash 2.0
  if (geminiApiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
        },
      });

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text().trim();

      try {
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
        const parsed = JSON.parse(jsonText);

        return {
          summary: parsed.summary || fallback.summary,
          insights: parsed.insights || fallback.insights,
          sentiment: parsed.sentiment || 'Neutral',
          voterFeelings: parsed.voterFeelings || fallback.voterFeelings,
        };
      } catch {
        // Fallback: treat entire response as summary
        const textParts = text.split('\n\n');
        return {
          summary: textParts[0]?.slice(0, 200) || fallback.summary,
          insights: textParts[1]?.slice(0, 300) || fallback.insights,
          sentiment: 'Neutral',
          voterFeelings: textParts.slice(2).join(' ').slice(0, 400) || fallback.voterFeelings,
        };
      }
    } catch (err) {
      console.error('Gemini analysis error:', err);
    }
  }

  return fallback;
}

/**
 * Generate chart image URL using QuickChart
 */
function getChartImageUrl(options: ReportOption[], totalVotes: number): string {
  const labels = options.map((o) =>
    o.label.length > 25 ? o.label.slice(0, 22) + '...' : o.label
  );
  const data = options.map((o) => o.votes);

  // Professional color palette
  const colors = [
    'rgba(16, 185, 129, 0.85)',  // Primary green
    'rgba(59, 130, 246, 0.85)',  // Blue
    'rgba(168, 85, 247, 0.85)',  // Purple
    'rgba(236, 72, 153, 0.85)',  // Pink
    'rgba(251, 146, 60, 0.85)',  // Orange
  ];

  const chartConfig = {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Votes',
        data,
        backgroundColor: colors.slice(0, data.length),
        borderColor: colors.slice(0, data.length).map(c => c.replace('0.85', '1')),
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      legend: { display: false },
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: true,
            precision: 0,
          },
          gridLines: {
            color: 'rgba(0,0,0,0.1)',
          },
        }],
        xAxes: [{
          gridLines: {
            display: false,
          },
        }],
      },
    },
  };

  const encoded = encodeURIComponent(JSON.stringify(chartConfig));
  return `https://quickchart.io/chart?c=${encoded}&width=600&height=320&format=png`;
}

/**
 * Fetch chart image as base64
 */
async function fetchChartImage(chartUrl: string): Promise<string | null> {
  try {
    const response = await fetch(chartUrl, {
      headers: {
        'User-Agent': 'VeilProtocol-Report-Generator/1.0',
      },
    });

    if (!response.ok) {
      console.warn('Chart fetch failed:', response.status);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  } catch (error) {
    console.error('Chart image fetch error:', error);
    return null;
  }
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
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

/**
 * Format address for display (truncate if too long)
 */
function formatAddress(address: string | undefined): string {
  if (!address) return 'Not available';
  if (address.length <= 20) return address;
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

/**
 * Load logo as base64 data URL
 */
function getLogoBase64(): string | null {
  try {
    // Try to read from public folder
    const logoPath = join(process.cwd(), 'public', 'logo.svg');
    const logoContent = readFileSync(logoPath, 'utf-8');
    
    // Encode SVG content for data URL
    const encoded = Buffer.from(logoContent).toString('base64');
    return `data:image/svg+xml;base64,${encoded}`;
  } catch (error) {
    // Try alternative path (for different build environments)
    try {
      const altPath = join(process.cwd(), 'frontend', 'public', 'logo.svg');
      const logoContent = readFileSync(altPath, 'utf-8');
      const encoded = Buffer.from(logoContent).toString('base64');
      return `data:image/svg+xml;base64,${encoded}`;
    } catch (altError) {
      console.warn('Could not load logo from any path:', error, altError);
      return null;
    }
  }
}

/**
 * Generate professional PDF report
 */
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
  const margin = 20;
  const contentW = pageW - 2 * margin;
  let y = 20;

  // ===== HEADER =====
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageW, 32, 'F');
  doc.setTextColor(255, 255, 255);
  
  // Add logo
  const logoBase64 = getLogoBase64();
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'SVG', margin, 8, 16, 16);
    } catch (error) {
      console.warn('Could not add logo image:', error);
    }
  }
  
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  const logoOffset = logoBase64 ? 20 : 0;
  doc.text('VeilProtocol', margin + logoOffset, 20);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Campaign Analysis Report', margin + logoOffset, 27);

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.setFontSize(9);
  doc.text(`Generated: ${currentDate}`, pageW - margin, 27, { align: 'right' });

  y = 40;

  // ===== CAMPAIGN TITLE =====
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(
    title.length > 70 ? title.slice(0, 67) + '...' : title,
    contentW
  );
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 6;

  // ===== CAMPAIGN METADATA =====
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Campaign ID: #${campaignId}`, margin, y);
  y += 5;
  
  if (creator) {
    doc.text(`Campaign Creator: ${formatAddress(creator)}`, margin, y);
    y += 5;
  }
  
  doc.text(`Voting Period: ${formatDate(startTime)} — ${formatDate(endTime)}`, margin, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(`Total Votes: ${totalVotes}`, margin, y);
  y += 12;

  // ===== RESULTS TABLE =====
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Voting Results', margin, y);
  y += 8;

  const tableData = options.map((o, idx) => [
    `${idx + 1}. ${o.label.length > 45 ? o.label.slice(0, 42) + '...' : o.label}`,
    String(o.votes),
    `${o.percentage ?? 0}%`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Option', 'Votes', 'Share']],
    body: tableData,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 11,
    },
    bodyStyles: {
      fontSize: 10,
      textColor: [30, 30, 30],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
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

  // ===== CHART =====
  if (chartBase64 && y < 200) {
    try {
      const chartHeight = 60;
      doc.addImage(
        `data:image/png;base64,${chartBase64}`,
        'PNG',
        margin,
        y,
        contentW,
        chartHeight
      );
      y += chartHeight + 12;
    } catch (error) {
      console.error('Chart image error:', error);
      y += 5;
    }
  }

  // Check if we need a new page
  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  // ===== AI ANALYSIS SECTION =====
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('AI-Powered Analysis', margin, y);
  y += 8;

  // Summary
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('Executive Summary', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  const summaryLines = doc.splitTextToSize(analysis.summary, contentW);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 5 + 8;

  // Insights
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('Key Insights', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  const insightsLines = doc.splitTextToSize(analysis.insights, contentW);
  doc.text(insightsLines, margin, y);
  y += insightsLines.length * 5 + 8;

  // Voter Feelings Analysis
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('What Voters Are Feeling', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  const feelingsLines = doc.splitTextToSize(analysis.voterFeelings, contentW);
  doc.text(feelingsLines, margin, y);
  y += feelingsLines.length * 5 + 8;

  // Sentiment badge
  const sentimentColors: Record<string, [number, number, number]> = {
    Positive: [16, 185, 129],
    Negative: [239, 68, 68],
    Neutral: [107, 114, 128],
    Mixed: [251, 146, 60],
  };
  const sentimentColor = sentimentColors[analysis.sentiment] || [107, 114, 128];

  doc.setFillColor(...sentimentColor);
  doc.roundedRect(margin, y - 4, 40, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Sentiment: ${analysis.sentiment}`, margin + 2, y + 2);
  y += 14;

  // ===== FOOTER WITH OWNER DETAILS =====
  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  doc.setDrawColor(229, 231, 235);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  // VeilProtocol branding with logo
  const footerLogoBase64 = getLogoBase64();
  if (footerLogoBase64) {
    try {
      doc.addImage(footerLogoBase64, 'SVG', margin, y - 2, 10, 10);
    } catch (error) {
      console.warn('Could not add footer logo:', error);
    }
  }
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  const logoFooterOffset = footerLogoBase64 ? 12 : 0;
  doc.text('VeilProtocol', margin + logoFooterOffset, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Privacy-Preserving Governance & Marketplace on Aleo Blockchain', margin, y);
  y += 6;

  // Owner/Creator details
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

  // Report metadata
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.text(`Report generated by VeilProtocol • Campaign #${campaignId}`, margin, y);
  y += 4;

  if (programId) {
    doc.text(`Program ID: ${programId}`, margin, y);
    y += 4;
  }

  // Final branding
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('© VeilProtocol. All rights reserved. Built on Aleo blockchain.', margin, y + 4);

  // Convert to ArrayBuffer for web response compatibility
  return doc.output('arraybuffer') as ArrayBuffer;
}

/**
 * Main POST handler
 */
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

    // Validation
    if (!title || !options?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: title and options are required' },
        { status: 400 }
      );
    }

    if (totalVotes < 0) {
      return NextResponse.json(
        { error: 'Invalid total votes count' },
        { status: 400 }
      );
    }

    // Ensure campaign has ended before allowing report generation
    try {
      const endDate = new Date(endTime);
      const now = new Date();
      if (endDate > now) {
        return NextResponse.json(
          { error: 'Report can only be generated after the campaign ends' },
          { status: 400 }
        );
      }
    } catch (dateError) {
      console.warn('Could not validate end time:', dateError);
    }

    // Parallel execution: Fetch chart and generate AI analysis simultaneously
    const chartUrl = getChartImageUrl(options, totalVotes);

    const [chartBase64, analysis] = await Promise.all([
      fetchChartImage(chartUrl),
      generateAIAnalysis(title, totalVotes, options, startTime, endTime),
    ]);

    // Generate PDF
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
    console.log(`Report generated in ${generationTime}ms for campaign #${campaignId}`);

    const filename = `veilprotocol-campaign-${campaignId}-report.pdf`;

    // Wrap bytes in a Blob so it is a valid BodyInit for NextResponse
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
  } catch (err: any) {
    console.error('Report generation error:', err);
    return NextResponse.json(
      {
        error: 'Report generation failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
