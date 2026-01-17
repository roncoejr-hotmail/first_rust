import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { LoanStatusStat } from '../api/finance';

interface Props {
  data: LoanStatusStat[];
}

export default function LoanStatusChart({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const width = 400;
    const height = 400;
    const radius = Math.min(width, height) / 2 - 40;

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Color scale with better colors for loan statuses
    const colorMap: { [key: string]: string } = {
      'active': '#4caf50',
      'approved': '#2196f3',
      'paid_off': '#9e9e9e',
      'defaulted': '#f44336',
      'refinanced': '#ff9800'
    };

    const color = (status: string) => colorMap[status] || '#9c27b0';

    // Create pie
    const pie = d3.pie<LoanStatusStat>()
      .value(d => d.count)
      .sort(null);

    // Create arc
    const arc = d3.arc<d3.PieArcDatum<LoanStatusStat>>()
      .innerRadius(radius * 0.6)
      .outerRadius(radius);

    const arcs = svg.selectAll('arc')
      .data(pie(data))
      .enter()
      .append('g');

    // Add slices
    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => color(d.data.status))
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    // Add percentage labels
    arcs.append('text')
      .attr('transform', d => {
        const pos = arc.centroid(d);
        return `translate(${pos[0]}, ${pos[1]})`;
      })
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .text(d => `${d.data.percentage.toFixed(1)}%`);

    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${radius + 40}, ${-radius})`);

    data.forEach((item, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 25})`);

      legendRow.append('rect')
        .attr('width', 18)
        .attr('height', 18)
        .attr('rx', 4)
        .attr('fill', color(item.status));

      legendRow.append('text')
        .attr('x', 24)
        .attr('y', 13)
        .style('font-size', '12px')
        .style('fill', '#666')
        .text(`${item.status.charAt(0).toUpperCase() + item.status.slice(1)} (${item.count})`);
    });

  }, [data]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
      <svg ref={svgRef}></svg>
    </div>
  );
}
