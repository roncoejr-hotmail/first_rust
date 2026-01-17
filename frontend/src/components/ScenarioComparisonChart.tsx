import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { MonthlyScenarioData } from '../api/scenario';

interface Props {
  data: MonthlyScenarioData[];
}

export default function ScenarioComparisonChart({ data }: Props) {
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
    const allValues = data.flatMap(d => [d.best_case, d.most_likely, d.worst_case]);
    const yMax = d3.max(allValues) || 0;
    const yMin = d3.min(allValues) || 0;
    const y = d3.scaleLinear()
      .domain([Math.min(0, yMin * 1.1), yMax * 1.1])
      .range([height, 0]);

    // Line generators
    const bestLine = d3.line<MonthlyScenarioData>()
      .x(d => (x(d.period) || 0) + x.bandwidth() / 2)
      .y(d => y(d.best_case))
      .curve(d3.curveMonotoneX);

    const likelyLine = d3.line<MonthlyScenarioData>()
      .x(d => (x(d.period) || 0) + x.bandwidth() / 2)
      .y(d => y(d.most_likely))
      .curve(d3.curveMonotoneX);

    const worstLine = d3.line<MonthlyScenarioData>()
      .x(d => (x(d.period) || 0) + x.bandwidth() / 2)
      .y(d => y(d.worst_case))
      .curve(d3.curveMonotoneX);

    // Add area between best and worst
    const area = d3.area<MonthlyScenarioData>()
      .x(d => (x(d.period) || 0) + x.bandwidth() / 2)
      .y0(d => y(d.worst_case))
      .y1(d => y(d.best_case))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(data)
      .attr('fill', '#e3f2fd')
      .attr('opacity', 0.5)
      .attr('d', area);

    // Add best case line
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#4caf50')
      .attr('stroke-width', 3)
      .attr('d', bestLine);

    // Add most likely line
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#2196f3')
      .attr('stroke-width', 3)
      .attr('d', likelyLine);

    // Add worst case line
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#f44336')
      .attr('stroke-width', 3)
      .attr('d', worstLine);

    // Add dots for best case
    svg.selectAll('.dot-best')
      .data(data)
      .join('circle')
      .attr('class', 'dot-best')
      .attr('cx', d => (x(d.period) || 0) + x.bandwidth() / 2)
      .attr('cy', d => y(d.best_case))
      .attr('r', 4)
      .attr('fill', '#4caf50')
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    // Add dots for most likely
    svg.selectAll('.dot-likely')
      .data(data)
      .join('circle')
      .attr('class', 'dot-likely')
      .attr('cx', d => (x(d.period) || 0) + x.bandwidth() / 2)
      .attr('cy', d => y(d.most_likely))
      .attr('r', 4)
      .attr('fill', '#2196f3')
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    // Add dots for worst case
    svg.selectAll('.dot-worst')
      .data(data)
      .join('circle')
      .attr('class', 'dot-worst')
      .attr('cx', d => (x(d.period) || 0) + x.bandwidth() / 2)
      .attr('cy', d => y(d.worst_case))
      .attr('r', 4)
      .attr('fill', '#f44336')
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
      .text('Net Income ($)');

    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width + 20}, 20)`);

    const legendItems = [
      { label: 'Best Case', color: '#4caf50' },
      { label: 'Most Likely', color: '#2196f3' },
      { label: 'Worst Case', color: '#f44336' }
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
