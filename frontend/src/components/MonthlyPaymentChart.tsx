import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { MonthlyPaymentTrend } from '../api/finance';

interface Props {
  data: MonthlyPaymentTrend[];
}

export default function MonthlyPaymentChart({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const margin = { top: 20, right: 120, bottom: 60, left: 80 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Prepare data for stacked bar chart
    const subgroups = ['principal_paid', 'interest_paid'];
    
    // X scale
    const x = d3.scaleBand()
      .domain(data.map(d => d.month))
      .range([0, width])
      .padding(0.3);

    // Y scale
    const maxValue = d3.max(data, d => d.principal_paid + d.interest_paid) || 0;
    const y = d3.scaleLinear()
      .domain([0, maxValue * 1.1])
      .range([height, 0]);

    // Color scale
    const color = d3.scaleOrdinal()
      .domain(subgroups)
      .range(['#2196f3', '#ff9800']);

    // Stack the data
    const stackedData = d3.stack()
      .keys(subgroups)
      // @ts-ignore
      (data);

    // Add bars
    svg.append('g')
      .selectAll('g')
      .data(stackedData)
      .join('g')
      .attr('fill', d => color(d.key) as string)
      .selectAll('rect')
      .data(d => d)
      .join('rect')
      .attr('x', (d: any) => x(d.data.month) || 0)
      .attr('y', d => y(d[1]))
      .attr('height', d => y(d[0]) - y(d[1]))
      .attr('width', x.bandwidth())
      .attr('rx', 4);

    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('font-size', '12px');

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
      .text('Payment Amount ($)');

    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width + 20}, 0)`);

    const legendItems = [
      { label: 'Principal', color: '#2196f3' },
      { label: 'Interest', color: '#ff9800' }
    ];

    legendItems.forEach((item, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 25})`);

      legendRow.append('rect')
        .attr('width', 18)
        .attr('height', 18)
        .attr('rx', 4)
        .attr('fill', item.color);

      legendRow.append('text')
        .attr('x', 24)
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
