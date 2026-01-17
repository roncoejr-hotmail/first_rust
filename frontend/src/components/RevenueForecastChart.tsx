import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { MonthlyFinancialTrend, ForecastProjection } from '../api/forecasting';

interface Props {
  historical: MonthlyFinancialTrend[];
  forecast: ForecastProjection[];
}

export default function RevenueForecastChart({ historical, forecast }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || historical.length === 0) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const margin = { top: 20, right: 120, bottom: 60, left: 80 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Take last 12 months of historical data
    const recentHistorical = historical.slice(-12);
    const allMonths = [...recentHistorical.map(d => d.month), ...forecast.map(d => d.month)];

    // X scale
    const x = d3.scaleBand()
      .domain(allMonths)
      .range([0, width])
      .padding(0.1);

    // Y scale
    const maxHistorical = d3.max(recentHistorical, d => d.revenue) || 0;
    const maxForecast = d3.max(forecast, d => d.projected_revenue) || 0;
    const maxValue = Math.max(maxHistorical, maxForecast);
    const y = d3.scaleLinear()
      .domain([0, maxValue * 1.1])
      .range([height, 0]);

    // Add historical line
    const historicalLine = d3.line<MonthlyFinancialTrend>()
      .x(d => (x(d.month) || 0) + x.bandwidth() / 2)
      .y(d => y(d.revenue))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(recentHistorical)
      .attr('fill', 'none')
      .attr('stroke', '#2196f3')
      .attr('stroke-width', 3)
      .attr('d', historicalLine);

    // Add historical dots
    svg.selectAll('.dot-historical')
      .data(recentHistorical)
      .join('circle')
      .attr('class', 'dot-historical')
      .attr('cx', d => (x(d.month) || 0) + x.bandwidth() / 2)
      .attr('cy', d => y(d.revenue))
      .attr('r', 4)
      .attr('fill', '#2196f3')
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    // Add forecast line
    if (forecast.length > 0) {
      const lastHistorical = recentHistorical[recentHistorical.length - 1];
      const forecastData = [
        { month: lastHistorical.month, value: lastHistorical.revenue },
        ...forecast.map(f => ({ month: f.month, value: f.projected_revenue }))
      ];

      const forecastLine = d3.line<{ month: string; value: number }>()
        .x(d => (x(d.month) || 0) + x.bandwidth() / 2)
        .y(d => y(d.value))
        .curve(d3.curveMonotoneX);

      svg.append('path')
        .datum(forecastData)
        .attr('fill', 'none')
        .attr('stroke', '#ff9800')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '5,5')
        .attr('d', forecastLine);

      // Add forecast dots with different colors by confidence
      const confidenceColors: Record<string, string> = {
        'High': '#4caf50',
        'Medium': '#ff9800',
        'Low': '#f44336'
      };

      svg.selectAll('.dot-forecast')
        .data(forecast)
        .join('circle')
        .attr('class', 'dot-forecast')
        .attr('cx', d => (x(d.month) || 0) + x.bandwidth() / 2)
        .attr('cy', d => y(d.projected_revenue))
        .attr('r', 5)
        .attr('fill', d => confidenceColors[d.confidence_level] || '#ff9800')
        .attr('stroke', 'white')
        .attr('stroke-width', 2);
    }

    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .style('font-size', '10px');

    // Add Y axis
    svg.append('g')
      .call(d3.axisLeft(y).ticks(8).tickFormat(d => `$${(d as number / 1000).toFixed(0)}k`))
      .style('font-size', '12px');

    // Add Y axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - height / 2)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('fill', '#666')
      .text('Revenue ($)');

    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width + 20}, 20)`);

    const legendItems = [
      { label: 'Historical', color: '#2196f3', dashed: false },
      { label: 'Forecast', color: '#ff9800', dashed: true }
    ];

    legendItems.forEach((item, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 25})`);

      legendRow.append('line')
        .attr('x1', 0)
        .attr('x2', 30)
        .attr('y1', 9)
        .attr('y2', 9)
        .attr('stroke', item.color)
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', item.dashed ? '5,5' : '0');

      legendRow.append('text')
        .attr('x', 36)
        .attr('y', 13)
        .style('font-size', '12px')
        .style('fill', '#666')
        .text(item.label);
    });

  }, [historical, forecast]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
      <svg ref={svgRef}></svg>
    </div>
  );
}
