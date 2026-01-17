import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Props {
  value: number; // 0-100 percentage
  label: string;
  status: string; // 'on-track', 'at-risk', 'off-track'
  size?: number;
}

export default function KPIGauge({ value, label, status, size = 150 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const radius = size / 2;
    const thickness = size / 8;
    const innerRadius = radius - thickness;

    const svg = d3
      .select(svgRef.current)
      .attr('width', size)
      .attr('height', size)
      .append('g')
      .attr('transform', `translate(${radius},${radius})`);

    // Background arc
    const backgroundArc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .endAngle(Math.PI / 2);

    svg.append('path')
      .attr('d', backgroundArc as any)
      .attr('fill', '#e0e0e0');

    // Value arc
    const clampedValue = Math.max(0, Math.min(100, value));
    const angle = -Math.PI / 2 + (clampedValue / 100) * Math.PI;

    const valueArc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .endAngle(angle);

    const color = status === 'on-track' ? '#4caf50' : status === 'at-risk' ? '#ff9800' : '#f44336';

    svg.append('path')
      .attr('d', valueArc as any)
      .attr('fill', color);

    // Center text - value
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.2em')
      .style('font-size', `${size / 5}px`)
      .style('font-weight', 'bold')
      .style('fill', '#333')
      .text(`${clampedValue.toFixed(0)}%`);

    // Center text - label
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.2em')
      .style('font-size', `${size / 12}px`)
      .style('fill', '#666')
      .text(label);

  }, [value, label, status, size]);

  return <svg ref={svgRef}></svg>;
}
