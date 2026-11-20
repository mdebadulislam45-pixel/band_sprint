/**
 * Code-Drawn Vector Chart Generator for IELTS Writing Task 1
 * Strictly complies with Requirement 5:
 * "generate a small numeric data table and draw the chart with code, never an AI-made picture."
 */

export interface ChartDataTable {
  title: string;
  unit: string;
  headers: string[];
  rows: Array<{ label: string; values: number[] }>;
}

export interface WritingTask1ChartSpec {
  chartType: 'bar' | 'line' | 'pie' | 'table';
  table: ChartDataTable;
  svgCode: string;
}

const PALETTE = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

/**
 * Generates standalone SVG code for a grouped or single Bar Chart
 */
export function generateBarChartSvg(table: ChartDataTable, width = 640, height = 360): string {
  const margin = { top: 50, right: 30, bottom: 60, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Find max value across all rows
  let maxVal = 0;
  table.rows.forEach((r) => {
    r.values.forEach((v) => {
      if (v > maxVal) maxVal = v;
    });
  });
  if (maxVal === 0) maxVal = 100;
  const yUpper = Math.ceil(maxVal * 1.15);

  const seriesCount = table.headers.length - 1; // excluding label column
  const groupCount = table.rows.length;
  const groupWidth = chartWidth / groupCount;
  const barWidth = Math.min(36, (groupWidth * 0.75) / Math.max(1, seriesCount));

  // Y-axis tick marks
  const ticks = [0, yUpper * 0.25, yUpper * 0.5, yUpper * 0.75, yUpper];
  const gridLines = ticks
    .map((t) => {
      const y = margin.top + chartHeight - (t / yUpper) * chartHeight;
      return `
        <line x1="${margin.left}" y1="${y}" x2="${margin.left + chartWidth}" y2="${y}" stroke="#e2e8f0" stroke-dasharray="3 3" />
        <text x="${margin.left - 10}" y="${y + 4}" font-size="11" font-family="sans-serif" fill="#64748b" text-anchor="end">${Math.round(t)}</text>
      `;
    })
    .join('');

  // Bars and group labels
  const bars = table.rows
    .map((r, gIdx) => {
      const groupX = margin.left + gIdx * groupWidth + groupWidth * 0.125;
      const barElements = r.values
        .map((v, sIdx) => {
          const barHeight = (v / yUpper) * chartHeight;
          const x = groupX + sIdx * barWidth;
          const y = margin.top + chartHeight - barHeight;
          const color = PALETTE[sIdx % PALETTE.length];
          return `
            <rect x="${x}" y="${y}" width="${barWidth - 4}" height="${barHeight}" fill="${color}" rx="3" opacity="0.9" />
            <text x="${x + (barWidth - 4) / 2}" y="${y - 6}" font-size="10" font-family="sans-serif" font-weight="bold" fill="#334155" text-anchor="middle">${v}</text>
          `;
        })
        .join('');

      const labelX = groupX + (seriesCount * barWidth) / 2;
      return `
        <g class="bar-group">
          ${barElements}
          <text x="${labelX}" y="${margin.top + chartHeight + 22}" font-size="11" font-family="sans-serif" font-weight="600" fill="#475569" text-anchor="middle">${r.label}</text>
        </g>
      `;
    })
    .join('');

  // Legend
  const legend = table.headers
    .slice(1)
    .map((h, sIdx) => {
      const color = PALETTE[sIdx % PALETTE.length];
      const legX = margin.left + sIdx * 130;
      return `
        <rect x="${legX}" y="${height - 20}" width="12" height="12" fill="${color}" rx="2" />
        <text x="${legX + 18}" y="${height - 10}" font-size="11" font-family="sans-serif" fill="#475569">${h}</text>
      `;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto max-w-2xl bg-white rounded-xl shadow-xs border border-slate-200">
      <!-- Title -->
      <text x="${width / 2}" y="28" font-size="15" font-family="sans-serif" font-weight="bold" fill="#0f172a" text-anchor="middle">${table.title}</text>
      <text x="${margin.left}" y="42" font-size="11" font-family="sans-serif" fill="#64748b">Unit: ${table.unit}</text>
      <!-- Gridlines -->
      ${gridLines}
      <!-- Axes -->
      <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" stroke="#94a3b8" stroke-width="1.5" />
      <line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${margin.left + chartWidth}" y2="${margin.top + chartHeight}" stroke="#94a3b8" stroke-width="1.5" />
      <!-- Bars -->
      ${bars}
      <!-- Legend -->
      ${legend}
    </svg>
  `.trim();
}

/**
 * Generates standalone SVG code for a Multi-Series Line Chart
 */
export function generateLineChartSvg(table: ChartDataTable, width = 640, height = 360): string {
  const margin = { top: 50, right: 30, bottom: 60, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  let maxVal = 0;
  table.rows.forEach((r) => {
    r.values.forEach((v) => {
      if (v > maxVal) maxVal = v;
    });
  });
  if (maxVal === 0) maxVal = 100;
  const yUpper = Math.ceil(maxVal * 1.15);

  const seriesCount = table.headers.length - 1;
  const groupCount = table.rows.length;
  const stepX = chartWidth / Math.max(1, groupCount - 1);

  // Y-axis ticks
  const ticks = [0, yUpper * 0.25, yUpper * 0.5, yUpper * 0.75, yUpper];
  const gridLines = ticks
    .map((t) => {
      const y = margin.top + chartHeight - (t / yUpper) * chartHeight;
      return `
        <line x1="${margin.left}" y1="${y}" x2="${margin.left + chartWidth}" y2="${y}" stroke="#e2e8f0" stroke-dasharray="3 3" />
        <text x="${margin.left - 10}" y="${y + 4}" font-size="11" font-family="sans-serif" fill="#64748b" text-anchor="end">${Math.round(t)}</text>
      `;
    })
    .join('');

  // X-axis labels
  const xLabels = table.rows
    .map((r, idx) => {
      const x = margin.left + idx * stepX;
      return `<text x="${x}" y="${margin.top + chartHeight + 22}" font-size="11" font-family="sans-serif" font-weight="600" fill="#475569" text-anchor="middle">${r.label}</text>`;
    })
    .join('');

  // Polylines and points per series
  const linesAndDots: string[] = [];
  for (let sIdx = 0; sIdx < seriesCount; sIdx++) {
    const color = PALETTE[sIdx % PALETTE.length];
    const points: Array<{ x: number; y: number; val: number }> = [];

    table.rows.forEach((r, rIdx) => {
      const x = margin.left + rIdx * stepX;
      const v = r.values[sIdx] ?? 0;
      const y = margin.top + chartHeight - (v / yUpper) * chartHeight;
      points.push({ x, y, val: v });
    });

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const dots = points
      .map(
        (p) => `
        <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="${color}" stroke="#ffffff" stroke-width="2" />
        <text x="${p.x}" y="${p.y - 8}" font-size="10" font-family="sans-serif" font-weight="bold" fill="${color}" text-anchor="middle">${p.val}</text>
      `
      )
      .join('');

    linesAndDots.push(`
      <g class="series-line">
        <path d="${pathData}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
        ${dots}
      </g>
    `);
  }

  // Legend
  const legend = table.headers
    .slice(1)
    .map((h, sIdx) => {
      const color = PALETTE[sIdx % PALETTE.length];
      const legX = margin.left + sIdx * 130;
      return `
        <line x1="${legX}" y1="${height - 14}" x2="${legX + 16}" y2="${height - 14}" stroke="${color}" stroke-width="2.5" />
        <circle cx="${legX + 8}" cy="${height - 14}" r="3.5" fill="${color}" />
        <text x="${legX + 24}" y="${height - 10}" font-size="11" font-family="sans-serif" fill="#475569">${h}</text>
      `;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto max-w-2xl bg-white rounded-xl shadow-xs border border-slate-200">
      <text x="${width / 2}" y="28" font-size="15" font-family="sans-serif" font-weight="bold" fill="#0f172a" text-anchor="middle">${table.title}</text>
      <text x="${margin.left}" y="42" font-size="11" font-family="sans-serif" fill="#64748b">Unit: ${table.unit}</text>
      ${gridLines}
      <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" stroke="#94a3b8" stroke-width="1.5" />
      <line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${margin.left + chartWidth}" y2="${margin.top + chartHeight}" stroke="#94a3b8" stroke-width="1.5" />
      ${xLabels}
      ${linesAndDots.join('')}
      ${legend}
    </svg>
  `.trim();
}

/**
 * Builds standard chart spec for Writing Task 1
 */
export function buildWritingTask1Chart(table: ChartDataTable, chartType: 'bar' | 'line' = 'bar'): WritingTask1ChartSpec {
  const svg = chartType === 'line' ? generateLineChartSvg(table) : generateBarChartSvg(table);
  return {
    chartType,
    table,
    svgCode: svg
  };
}
