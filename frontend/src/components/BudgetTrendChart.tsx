import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { MonthlyBudgetTrend } from '../api/budget';

interface Props {
  data: MonthlyBudgetTrend[];
}

export default function BudgetTrendChart({ data }: Props) {
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
    const maxValue = d3.max(data, d => Math.max(d.budgeted, d.actual)) || 0;
    const y = d3.scaleLinear()
      .domain([0, maxValue * 1.1])
      .range([height, 0]);

    // Line generators
    const budgetedLine = d3.line<MonthlyBudgetTrend>()
      .x(d => (x(d.month) || 0) + x.bandwidth() / 2)
      .y(d => y(d.budgeted))
      .curve(d3.curveMonotoneX);

    const actualLine = d3.line<MonthlyBudgetTrend>()
      .x(d => (x(d.month) || 0) + x.bandwidth() / 2)
      .y(d => y(d.actual))
      .curve(d3.curveMonotoneX);

    // Add budgeted line
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#2196f3')
      .attr('stroke-width', 3)
      .attr('d', budgetedLine);

    // Add actual line
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#4caf50')
      .attr('stroke-width', 3)
      .attr('d', actualLine);

    // Add budgeted dots
    svg.selectAll('.dot-budgeted')
      .data(data)
      .join('circle')
      .attr('class', 'dot-budgeted')
      .attr('cx', d => (x(d.month) || 0) + x.bandwidth() / 2)
      .attr('cy', d => y(d.budgeted))
      .attr('r', 4)
      .attr('fill', '#2196f3')
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    // Add actual dots
    svg.selectAll('.dot-actual')
      .data(data)
      .join('circle')
      .attr('class', 'dot-actual')
      .attr('cx', d => (x(d.month) || 0) + x.bandwidth() / 2)
      .attr('cy', d => y(d.actual))
      .attr('r', 4)
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
      { label: 'Budgeted', color: '#2196f3' },
      { label: 'Actual', color: '#4caf50' }
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
        .attr('stroke-width', 3);

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
