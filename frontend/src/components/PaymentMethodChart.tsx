import { useEffect, useRef } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import * as d3 from 'd3';
import type { PaymentMethodStat } from '../api/dashboard';

interface PaymentMethodChartProps {
  data: PaymentMethodStat[];
}

export default function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    // Dimensions
    const width = 300;
    const height = 300;
    const radius = Math.min(width, height) / 2;

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Pie generator
    const pie = d3
      .pie<PaymentMethodStat>()
      .value((d) => d.count)
      .sort(null);

    // Arc generator
    const arc = d3
      .arc<d3.PieArcDatum<PaymentMethodStat>>()
      .innerRadius(radius * 0.5)
      .outerRadius(radius * 0.8);

    const outerArc = d3
      .arc<d3.PieArcDatum<PaymentMethodStat>>()
      .innerRadius(radius * 0.9)
      .outerRadius(radius * 0.9);

    // Draw slices
    const slices = svg
      .selectAll('.slice')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'slice');

    slices
      .append('path')
      .attr('d', arc)
      .attr('fill', (_d, i) => color(i.toString()))
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .on('mouseover', function() {
        d3.select(this).attr('opacity', 0.8);
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 1);
      });

    // Add labels
    slices
      .append('text')
      .attr('transform', (d) => {
        const pos = outerArc.centroid(d);
        const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        pos[0] = radius * 0.95 * (midangle < Math.PI ? 1 : -1);
        return `translate(${pos})`;
      })
      .style('text-anchor', (d) => {
        const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        return midangle < Math.PI ? 'start' : 'end';
      })
      .text((d) => `${d.data.method} (${d.data.count})`)
      .style('font-size', '12px')
      .style('fill', '#333');

    // Add polylines
    slices
      .append('polyline')
      .attr('points', (d) => {
        const pos = outerArc.centroid(d);
        const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        pos[0] = radius * 0.95 * (midangle < Math.PI ? 1 : -1);
        return [arc.centroid(d), outerArc.centroid(d), pos].map((p) => p.join(',')).join(' ');
      })
      .style('fill', 'none')
      .style('stroke', '#999')
      .style('stroke-width', 1);

  }, [data]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Sales by Payment Method
        </Typography>
        <Box display="flex" justifyContent="center">
          <svg ref={svgRef} />
        </Box>
      </CardContent>
    </Card>
  );
}
