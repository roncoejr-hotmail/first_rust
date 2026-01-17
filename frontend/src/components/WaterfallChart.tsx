import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { WaterfallItem } from '../api/variance';

interface Props {
  data: WaterfallItem[];
}

export default function WaterfallChart({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const margin = { top: 40, right: 120, bottom: 80, left: 100 };
    const width = 1000 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X scale
    const x = d3.scaleBand()
      .domain(data.map(d => d.label))
      .range([0, width])
      .padding(0.3);

    // Y scale
    const allValues = data.flatMap(d => [d.value, d.cumulative]);
    const yMin = Math.min(0, ...allValues);
    const yMax = Math.max(...allValues);
    const y = d3.scaleLinear()
      .domain([yMin * 1.1, yMax * 1.1])
      .range([height, 0]);

    // Color scale
    const getColor = (item: WaterfallItem) => {
      if (item.item_type === 'start' || item.item_type === 'total') return '#607d8b';
      if (item.item_type === 'increase') return '#f44336'; // Red for over budget
      return '#4caf50'; // Green for under budget
    };

    // Calculate bar positions for waterfall effect
    const barData = data.map((d, i) => {
      if (d.item_type === 'start' || d.item_type === 'total') {
        return {
          ...d,
          y0: 0,
          y1: d.value,
        };
      } else {
        const prevCumulative = i > 0 ? data[i - 1].cumulative : 0;
        return {
          ...d,
          y0: Math.min(prevCumulative, d.cumulative),
          y1: Math.max(prevCumulative, d.cumulative),
        };
      }
    });

    // Add bars
    svg.selectAll('.bar')
      .data(barData)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.label) || 0)
      .attr('y', d => y(d.y1))
      .attr('width', x.bandwidth())
      .attr('height', d => Math.abs(y(d.y0) - y(d.y1)))
      .attr('fill', d => getColor(d))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('rx', 4);

    // Add connecting lines (for non-start/total bars)
    for (let i = 1; i < barData.length - 1; i++) {
      const current = barData[i];
      const next = barData[i + 1];
      
      if (current.item_type !== 'start' && current.item_type !== 'total') {
        const x1 = (x(current.label) || 0) + x.bandwidth();
        const x2 = x(next.label) || 0;
        const yPos = y(current.cumulative);
        
        svg.append('line')
          .attr('x1', x1)
          .attr('x2', x2)
          .attr('y1', yPos)
          .attr('y2', yPos)
          .attr('stroke', '#999')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3');
      }
    }

    // Add value labels on bars
    svg.selectAll('.label')
      .data(barData)
      .join('text')
      .attr('class', 'label')
      .attr('x', d => (x(d.label) || 0) + x.bandwidth() / 2)
      .attr('y', d => {
        const barHeight = Math.abs(y(d.y0) - y(d.y1));
        if (barHeight > 30) {
          return y(d.y1) + (d.y1 > d.y0 ? barHeight / 2 : -barHeight / 2) + 5;
        }
        return y(d.y1) - 10;
      })
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .style('fill', d => {
        const barHeight = Math.abs(y(d.y0) - y(d.y1));
        return barHeight > 30 ? '#fff' : '#333';
      })
      .text(d => {
        if (d.item_type === 'start' || d.item_type === 'total') {
          return `$${(d.value / 1000).toFixed(0)}k`;
        }
        return `${d.value > 0 ? '+' : ''}$${(d.value / 1000).toFixed(0)}k`;
      });

    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .style('font-size', '11px')
      .style('font-weight', d => {
        const item = data.find(item => item.label === d);
        return item?.item_type === 'start' || item?.item_type === 'total' ? 'bold' : 'normal';
      });

    // Add Y axis
    svg.append('g')
      .call(d3.axisLeft(y).ticks(10).tickFormat(d => `$${(d as number / 1000).toFixed(0)}k`))
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

    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -20)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .style('fill', '#333')
      .text('Budget to Actual Waterfall Analysis');

    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width + 20}, 20)`);

    const legendItems = [
      { label: 'Budget/Actual', color: '#607d8b' },
      { label: 'Over Budget', color: '#f44336' },
      { label: 'Under Budget', color: '#4caf50' }
    ];

    legendItems.forEach((item, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 25})`);

      legendRow.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', item.color)
        .attr('rx', 2);

      legendRow.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .style('font-size', '11px')
        .style('fill', '#666')
        .text(item.label);
    });

  }, [data]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px', overflowX: 'auto' }}>
      <svg ref={svgRef}></svg>
    </div>
  );
}
