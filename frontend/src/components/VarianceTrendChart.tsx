import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { MonthlyVariance } from '../api/variance';

interface Props {
  data: MonthlyVariance[];
}

export default function VarianceTrendChart({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const margin = { top: 20, right: 120, bottom: 60, left: 80 };
    const width = 900 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X scale
    const x = d3.scaleBand()
      .domain(data.map(d => d.month))
      .range([0, width])
      .padding(0.1);

    // Y scale
    const allValues = data.flatMap(d => [d.variance, d.cumulative_variance]);
    const yMin = Math.min(0, ...allValues);
    const yMax = Math.max(0, ...allValues);
    const y = d3.scaleLinear()
      .domain([yMin * 1.2, yMax * 1.2])
      .range([height, 0]);

    // Zero line
    svg.append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', y(0))
      .attr('y2', y(0))
      .attr('stroke', '#333')
      .attr('stroke-width', 2);

    // Variance bars
    svg.selectAll('.variance-bar')
      .data(data)
      .join('rect')
      .attr('class', 'variance-bar')
      .attr('x', d => x(d.month) || 0)
      .attr('y', d => d.variance >= 0 ? y(d.variance) : y(0))
      .attr('width', x.bandwidth())
      .attr('height', d => Math.abs(y(0) - y(d.variance)))
      .attr('fill', d => d.variance >= 0 ? '#f44336' : '#4caf50')
      .attr('opacity', 0.7)
      .attr('rx', 3);

    // Cumulative variance line
    const cumulativeLine = d3.line<MonthlyVariance>()
      .x(d => (x(d.month) || 0) + x.bandwidth() / 2)
      .y(d => y(d.cumulative_variance))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#2196f3')
      .attr('stroke-width', 3)
      .attr('d', cumulativeLine);

    // Cumulative variance dots
    svg.selectAll('.cumulative-dot')
      .data(data)
      .join('circle')
      .attr('class', 'cumulative-dot')
      .attr('cx', d => (x(d.month) || 0) + x.bandwidth() / 2)
      .attr('cy', d => y(d.cumulative_variance))
      .attr('r', 5)
      .attr('fill', '#2196f3')
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
      .call(d3.axisLeft(y).ticks(10).tickFormat(d => `$${(d as number / 1000).toFixed(0)}k`))
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
      .text('Variance ($)');

    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width + 20}, 20)`);

    const legendItems = [
      { label: 'Monthly Variance', type: 'rect', color: '#999' },
      { label: 'Cumulative', type: 'line', color: '#2196f3' }
    ];

    legendItems.forEach((item, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 25})`);

      if (item.type === 'rect') {
        legendRow.append('rect')
          .attr('width', 15)
          .attr('height', 15)
          .attr('fill', item.color)
          .attr('opacity', 0.7)
          .attr('rx', 2);
      } else {
        legendRow.append('line')
          .attr('x1', 0)
          .attr('x2', 30)
          .attr('y1', 9)
          .attr('y2', 9)
          .attr('stroke', item.color)
          .attr('stroke-width', 3);
      }

      legendRow.append('text')
        .attr('x', 36)
        .attr('y', 13)
        .style('font-size', '11px')
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
