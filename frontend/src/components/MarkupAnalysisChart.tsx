import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { CostPriceAnalysis } from '../api/inventory';

interface Props {
  data: CostPriceAnalysis[];
}

export default function MarkupAnalysisChart({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const margin = { top: 20, right: 100, bottom: 60, left: 80 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X scale
    const x = d3.scaleBand()
      .domain(data.map(d => d.vehicle_type))
      .range([0, width])
      .padding(0.3);

    // Y scale
    const maxValue = d3.max(data, d => Math.max(d.avg_cost, d.avg_sale_price)) || 0;
    const y = d3.scaleLinear()
      .domain([0, maxValue * 1.1])
      .range([height, 0]);

    // Color scale
    const colorCost = '#ff9800';
    const colorPrice = '#2196f3';

    // Add cost bars
    svg.selectAll('.bar-cost')
      .data(data)
      .join('rect')
      .attr('class', 'bar-cost')
      .attr('x', d => (x(d.vehicle_type) || 0) + x.bandwidth() / 4)
      .attr('y', d => y(d.avg_cost))
      .attr('width', x.bandwidth() / 3)
      .attr('height', d => height - y(d.avg_cost))
      .attr('fill', colorCost)
      .attr('rx', 4);

    // Add price bars
    svg.selectAll('.bar-price')
      .data(data)
      .join('rect')
      .attr('class', 'bar-price')
      .attr('x', d => (x(d.vehicle_type) || 0) + (x.bandwidth() / 4) * 2.5)
      .attr('y', d => y(d.avg_sale_price))
      .attr('width', x.bandwidth() / 3)
      .attr('height', d => height - y(d.avg_sale_price))
      .attr('fill', colorPrice)
      .attr('rx', 4);

    // Add markup percentage labels
    svg.selectAll('.markup-label')
      .data(data)
      .join('text')
      .attr('class', 'markup-label')
      .attr('x', d => (x(d.vehicle_type) || 0) + x.bandwidth() / 2)
      .attr('y', d => y(d.avg_sale_price) - 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .style('fill', '#4caf50')
      .text(d => `+${d.avg_markup_percentage.toFixed(1)}%`);

    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
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
      .text('Price ($)');

    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width + 10}, 0)`);

    const legendItems = [
      { label: 'Avg Cost', color: colorCost },
      { label: 'Avg Sale', color: colorPrice }
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
