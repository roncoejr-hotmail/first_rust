import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { RollingForecastTrend } from '../api/rolling';

interface Props {
  data: RollingForecastTrend[];
}

export default function RollingForecastTrendChart({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const margin = { top: 20, right: 120, bottom: 60, left: 80 };
    const width = 1000 - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;

    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X scale
    const x = d3.scaleBand()
      .domain(data.map(d => d.period))
      .range([0, width])
      .padding(0.1);

    // Y scale
    const allValues = data.flatMap(d => [d.forecasted, d.actual].filter(v => v !== 0));
    const yMax = d3.max(allValues) || 0;
    const yMin = d3.min(allValues) || 0;
    const y = d3.scaleLinear()
      .domain([Math.min(0, yMin * 1.1), yMax * 1.1])
      .range([height, 0]);

    // Line generators
    const forecastLine = d3.line<RollingForecastTrend>()
      .x(d => (x(d.period) || 0) + x.bandwidth() / 2)
      .y(d => y(d.forecasted))
      .curve(d3.curveMonotoneX);

    const actualLine = d3.line<RollingForecastTrend>()
      .defined(d => d.actual !== 0)
      .x(d => (x(d.period) || 0) + x.bandwidth() / 2)
      .y(d => y(d.actual))
      .curve(d3.curveMonotoneX);

    // Add forecast line
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#2196f3')
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '5,5')
      .attr('d', forecastLine);

    // Add actual line
    svg.append('path')
      .datum(data.filter(d => d.actual !== 0))
      .attr('fill', 'none')
      .attr('stroke', '#4caf50')
      .attr('stroke-width', 3)
      .attr('d', actualLine);

    // Add forecast dots
    svg.selectAll('.dot-forecast')
      .data(data)
      .join('circle')
      .attr('class', 'dot-forecast')
      .attr('cx', d => (x(d.period) || 0) + x.bandwidth() / 2)
      .attr('cy', d => y(d.forecasted))
      .attr('r', 4)
      .attr('fill', '#2196f3')
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    // Add actual dots (only for non-zero values)
    svg.selectAll('.dot-actual')
      .data(data.filter(d => d.actual !== 0))
      .join('circle')
      .attr('class', 'dot-actual')
      .attr('cx', d => (x(d.period) || 0) + x.bandwidth() / 2)
      .attr('cy', d => y(d.actual))
      .attr('r', 5)
      .attr('fill', '#4caf50')
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

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
      .text('Amount ($)');

    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width + 20}, 20)`);

    const legendItems = [
      { label: 'Forecasted', color: '#2196f3', dashed: true },
      { label: 'Actual', color: '#4caf50', dashed: false }
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

  }, [data]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
      <svg ref={svgRef}></svg>
    </div>
  );
}
