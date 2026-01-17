import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { CategoryScenarioBreakdown } from '../api/scenario';

interface Props {
  data: CategoryScenarioBreakdown[];
}

export default function CategoryScenarioChart({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

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

    // X scale
    const x = d3.scaleBand()
      .domain(data.map(d => d.category))
      .range([0, width])
      .padding(0.2);

    // Y scale
    const maxValue = d3.max(data, d => Math.max(d.best_case, d.most_likely, d.worst_case)) || 0;
    const y = d3.scaleLinear()
      .domain([0, maxValue * 1.1])
      .range([height, 0]);

    // Subgroups
    const subgroups = ['worst_case', 'most_likely', 'best_case'];
    const xSubgroup = d3.scaleBand()
      .domain(subgroups)
      .range([0, x.bandwidth()])
      .padding(0.05);

    const color = d3.scaleOrdinal()
      .domain(subgroups)
      .range(['#f44336', '#2196f3', '#4caf50']);

    // Add bars
    svg.append('g')
      .selectAll('g')
      .data(data)
      .join('g')
      .attr('transform', d => `translate(${x(d.category)},0)`)
      .selectAll('rect')
      .data(d => subgroups.map(key => ({ 
        key, 
        value: key === 'best_case' ? d.best_case : key === 'most_likely' ? d.most_likely : d.worst_case 
      })))
      .join('rect')
      .attr('x', d => xSubgroup(d.key) || 0)
      .attr('y', d => y(d.value))
      .attr('width', xSubgroup.bandwidth())
      .attr('height', d => height - y(d.value))
      .attr('fill', d => color(d.key) as string)
      .attr('rx', 3);

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

    const legendLabels = ['Best Case', 'Most Likely', 'Worst Case'];
    subgroups.forEach((key, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 25})`);

      legendRow.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', color(key) as string)
        .attr('rx', 2);

      legendRow.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .style('font-size', '12px')
        .style('fill', '#666')
        .text(legendLabels[i]);
    });

  }, [data]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
      <svg ref={svgRef}></svg>
    </div>
  );
}
