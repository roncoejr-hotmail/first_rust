import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { KPITrend } from '../api/kpi';

interface Props {
  data: KPITrend[];
  kpiName: string;
}

export default function KPITrendChart({ data, kpiName }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const margin = { top: 20, right: 100, bottom: 60, left: 70 };
    const width = 700 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

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
    const maxValue = d3.max(data, d => Math.max(d.target, d.actual)) || 0;
    const y = d3.scaleLinear()
      .domain([0, maxValue * 1.2])
      .range([height, 0]);

    // Line generators
    const targetLine = d3.line<KPITrend>()
      .x(d => (x(d.period) || 0) + x.bandwidth() / 2)
      .y(d => y(d.target))
      .curve(d3.curveMonotoneX);

    const actualLine = d3.line<KPITrend>()
      .x(d => (x(d.period) || 0) + x.bandwidth() / 2)
      .y(d => y(d.actual))
      .curve(d3.curveMonotoneX);

    // Add target line
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#2196f3')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('d', targetLine);

    // Add actual line
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#4caf50')
      .attr('stroke-width', 3)
      .attr('d', actualLine);

    // Add target dots
    svg.selectAll('.dot-target')
      .data(data)
      .join('circle')
      .attr('class', 'dot-target')
      .attr('cx', d => (x(d.period) || 0) + x.bandwidth() / 2)
      .attr('cy', d => y(d.target))
      .attr('r', 3)
      .attr('fill', '#2196f3')
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    // Add actual dots
    svg.selectAll('.dot-actual')
      .data(data)
      .join('circle')
      .attr('class', 'dot-actual')
      .attr('cx', d => (x(d.period) || 0) + x.bandwidth() / 2)
      .attr('cy', d => y(d.actual))
      .attr('r', 4)
      .attr('fill', d => d.actual >= d.target ? '#4caf50' : '#f44336')
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
      .call(d3.axisLeft(y).ticks(6))
      .style('font-size', '11px');

    // Add Y axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - height / 2)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#666')
      .text('Value');

    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width + 10}, 20)`);

    const legendItems = [
      { label: 'Target', color: '#2196f3', dashed: true },
      { label: 'Actual', color: '#4caf50', dashed: false }
    ];

    legendItems.forEach((item, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);

      legendRow.append('line')
        .attr('x1', 0)
        .attr('x2', 25)
        .attr('y1', 9)
        .attr('y2', 9)
        .attr('stroke', item.color)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', item.dashed ? '5,5' : '0');

      legendRow.append('text')
        .attr('x', 30)
        .attr('y', 13)
        .style('font-size', '11px')
        .style('fill', '#666')
        .text(item.label);
    });

  }, [data, kpiName]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
      <svg ref={svgRef}></svg>
    </div>
  );
}
