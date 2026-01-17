import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { ForecastAccuracy } from '../api/rolling';

interface Props {
  data: ForecastAccuracy[];
}

export default function ForecastAccuracyChart({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect() => {
    if (!svgRef.current || data.length === 0) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const margin = { top: 20, right: 40, bottom: 60, left: 80 };
    const width = 700 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X scale
    const x = d3.scaleBand()
      .domain(data.map(d => d.category))
      .range([0, width])
      .padding(0.3);

    // Y scale
    const y = d3.scaleLinear()
      .domain([0, 100])
      .range([height, 0]);

    // Add bars
    svg.selectAll('.bar')
      .data(data)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.category) || 0)
      .attr('y', d => y(d.accuracy_percentage))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.accuracy_percentage))
      .attr('fill', d => {
        if (d.accuracy_percentage >= 90) return '#4caf50';
        if (d.accuracy_percentage >= 75) return '#ff9800';
        return '#f44336';
      })
      .attr('rx', 4);

    // Add value labels
    svg.selectAll('.label')
      .data(data)
      .join('text')
      .attr('class', 'label')
      .attr('x', d => (x(d.category) || 0) + x.bandwidth() / 2)
      .attr('y', d => y(d.accuracy_percentage) - 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', '#333')
      .text(d => `${d.accuracy_percentage.toFixed(0)}%`);

    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .style('font-size', '11px')
      .style('text-transform', 'capitalize');

    // Add Y axis
    svg.append('g')
      .call(d3.axisLeft(y).ticks(10).tickFormat(d => `${d}%`))
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
      .text('Forecast Accuracy (%)');

    // Add reference line at 90%
    svg.append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', y(90))
      .attr('y2', y(90))
      .attr('stroke', '#4caf50')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('opacity', 0.5);

  }, [data]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
      <svg ref={svgRef}></svg>
    </div>
  );
}
