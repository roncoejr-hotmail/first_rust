import { useEffect, useRef } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import * as d3 from 'd3';
import { MonthlyRevenue } from '../api/dashboard';

interface RevenueChartProps {
  data: MonthlyRevenue[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
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
      .padding(0.1);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.revenue) || 0])
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

    svg.append('g').call(d3.axisLeft(y).tickFormat((d) => `$${(d as number / 1000).toFixed(0)}k`));

    // Bars
    svg
      .selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d) => x(d.month)!)
      .attr('y', (d) => y(d.revenue))
      .attr('width', x.bandwidth())
      .attr('height', (d) => height - y(d.revenue))
      .attr('fill', '#1976d2')
      .attr('opacity', 0.8)
      .on('mouseover', function() {
        d3.select(this).attr('opacity', 1);
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.8);
      });

    // Line
    const line = d3
      .line<MonthlyRevenue>()
      .x((d) => x(d.month)! + x.bandwidth() / 2)
      .y((d) => y(d.revenue))
      .curve(d3.curveMonotoneX);

    svg
      .append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#ff6b6b')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Points
    svg
      .selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', (d) => x(d.month)! + x.bandwidth() / 2)
      .attr('cy', (d) => y(d.revenue))
      .attr('r', 4)
      .attr('fill', '#ff6b6b');

  }, [data]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Revenue Trend
        </Typography>
        <Box sx={{ width: '100%', overflow: 'hidden' }}>
          <svg ref={svgRef} style={{ width: '100%', height: '300px' }} />
        </Box>
      </CardContent>
    </Card>
  );
}
