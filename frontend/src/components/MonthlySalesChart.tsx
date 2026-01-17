import { useEffect, useRef } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import * as d3 from 'd3';
import type { MonthlySalesPerformance } from '../api/salesPerformance';

interface MonthlySalesChartProps {
  data: MonthlySalesPerformance[];
}

export default function MonthlySalesChart({ data }: MonthlySalesChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    // Dimensions
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3
      .scaleBand()
      .domain(data.map((d) => d.month))
      .range([0, width])
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.sales_count) || 0])
      .nice()
      .range([height, 0]);

    // Axes
    svg
      .append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    svg.append('g').call(d3.axisLeft(y).ticks(5));

    // Bars
    svg
      .selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d) => x(d.month)!)
      .attr('y', (d) => y(d.sales_count))
      .attr('width', x.bandwidth())
      .attr('height', (d) => height - y(d.sales_count))
      .attr('fill', '#4caf50')
      .attr('opacity', 0.8)
      .on('mouseover', function() {
        d3.select(this).attr('opacity', 1);
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.8);
      });

    // Add labels on bars
    svg
      .selectAll('.label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('x', (d) => x(d.month)! + x.bandwidth() / 2)
      .attr('y', (d) => y(d.sales_count) - 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', '#333')
      .text((d) => d.sales_count);

  }, [data]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Monthly Sales Volume
        </Typography>
        <Box sx={{ width: '100%', overflow: 'hidden' }}>
          <svg ref={svgRef} style={{ width: '100%', height: '300px' }} />
        </Box>
      </CardContent>
    </Card>
  );
}
