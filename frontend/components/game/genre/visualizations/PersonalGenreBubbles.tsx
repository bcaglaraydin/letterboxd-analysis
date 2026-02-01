'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Film } from 'lucide-react';
import * as d3 from 'd3';
import { MOCK_GENRE_DATA, GenreData } from './mockData';
import { AnimatePresence } from 'framer-motion';
import { BubblePosterStrip } from './BubblePosterStrip';

interface BubbleNode extends d3.SimulationNodeDatum {
  id: string;
  genre: GenreData;
  r: number;
  x?: number;
  y?: number;
}

export function PersonalGenreBubbles() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredGenre, setHoveredGenre] = useState<{
    genre: GenreData;
    x: number;
    y: number;
    r: number;
  } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // 1. Normalize Data
  const { nodes, getGenreBaseColor, minRating, maxRating } = useMemo(() => {
    // Filter for user data only
    const data = MOCK_GENRE_DATA.filter((g) => g.userWatchCount > 0);

    // Rating Range for Color Intensity
    const minRating = d3.min(data, (d) => d.userAvgRating) || 0;
    const maxRating = d3.max(data, (d) => d.userAvgRating) || 5;

    // Watch Count Range for Size
    const minCount = d3.min(data, (d) => d.userWatchCount) || 0;
    const maxCount = d3.max(data, (d) => d.userWatchCount) || 100;

    // Color Mapping
    const BASE_COLOR = '#E76F51';

    const getGenreBaseColor = (_id: string) => BASE_COLOR;

    // Size Scale
    const isMobile = dimensions.width > 0 && dimensions.width < 768;
    // Tighter radius range to ensure fitting on small screens
    const radiusRange: [number, number] = isMobile ? [25, 70] : [50, 120];
    const radiusScale = d3.scaleSqrt().domain([minCount, maxCount]).range(radiusRange);

    // Sort data by rating descending
    data.sort((a, b) => b.userAvgRating - a.userAvgRating);

    const nodes: BubbleNode[] = data.map((d, i) => {
      return {
        id: d.id,
        r: radiusScale(d.userWatchCount),
        x: Math.cos(i) * i * 5,
        y: Math.sin(i) * i * 5,
        genre: d,
      };
    });

    return { nodes, getGenreBaseColor, minRating, maxRating };
  }, [dimensions.width]);

  // 2. Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: window.innerHeight,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 3. D3 Simulation
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = dimensions.width;
    const height = dimensions.height;
    const isMobile = width < 768;
    const centerX = width / 2;
    // Shift center down to avoid Header/Title overlap
    const centerY = height / 2 + 50;

    const g = svg.append('g');

    // Forces
    const totalArea = nodes.reduce((acc, node) => acc + Math.PI * Math.pow(node.r + 5, 2), 0);
    const packedRadius = Math.sqrt(totalArea / Math.PI);

    // Ensure the target orbit fits within the screen
    // Note: radiusRange is [25, 70] for mobile, [50, 120] for desktop
    const maxBubbleR = isMobile ? 70 : 120;
    const minDimensionHalf = Math.min(width, height) / 2;

    // Add extra padding for mobile to prevent edge touching
    const screenPadding = isMobile ? 15 : 0;

    // Cap the orbit radius so the outer edge of bubbles stays inside:
    // Available Space = minDimensionHalf - maxBubbleR - padding
    const safeOrbitRadius = Math.max(0, minDimensionHalf - maxBubbleR - screenPadding - 10);

    // Use the smaller of the ideal packed size or the safe screen limit
    const maxOrbitRadius = Math.min(packedRadius * 1.1, safeOrbitRadius);

    const simulation = d3
      .forceSimulation<BubbleNode>(nodes)
      .force('charge', d3.forceManyBody().strength(-5))
      .force(
        'collide',
        d3
          .forceCollide<BubbleNode>()
          .radius((d) => d.r + 2)
          .strength(0.8)
          .iterations(2),
      )
      .force(
        'radial',
        d3
          .forceRadial<BubbleNode>(
            (d) => {
              const normalized = (d.genre.userAvgRating - minRating) / (maxRating - minRating || 1);
              // Invert normalized: High rating (1.0) -> inner center (0)
              // Low rating (0.0) -> outer edge (maxOrbitRadius)
              // Adding even more separation for mobile to ensure core fits
              const targetR = Math.pow(1 - normalized, 1.2) * maxOrbitRadius;
              return targetR;
            },
            centerX,
            centerY,
          )
          .strength((d) => {
            const normalized = (d.genre.userAvgRating - minRating) / (maxRating - minRating || 1);
            // Stronger pull for decent ratings to ensure they cluster
            return 0.8 + normalized * 0.4; // Range 0.8 - 1.2
          }),
      );

    // CONTAINER GROUP
    const nodeContainers = g
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'cursor-pointer')
      .on('mouseenter', (event, d) => {
        setHoveredGenre({ genre: d.genre, x: d.x!, y: d.y!, r: d.r });
      })
      .on('mouseleave', () => {
        setHoveredGenre(null);
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        setHoveredGenre({ genre: d.genre, x: d.x!, y: d.y!, r: d.r });
      });

    const content = nodeContainers
      .append('g')
      .attr('class', 'transition-transform duration-300 ease-out hover:scale-110');

    // Bubble shape
    content
      .append('circle')
      .attr('r', (d) => d.r)
      .attr('fill', (d) => {
        const base = d3.hsl(getGenreBaseColor(d.id));
        if (base) {
          const normalized = (d.genre.userAvgRating - minRating) / (maxRating - minRating || 1);
          base.s = Math.min(1, base.s * (0.4 + 0.9 * Math.pow(normalized, 1.4)));
          base.l = Math.min(0.9, base.l + (1 - normalized) * 0.05);
          return base.formatHex();
        }
        return '#ccc';
      })
      .attr('fill-opacity', (d) => {
        const normalized = (d.genre.userAvgRating - minRating) / (maxRating - minRating || 1);
        return 0.75 + normalized * 0.25;
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.4)
      .style('filter', 'drop-shadow(0px 4px 12px rgba(0,0,0,0.1))');

    // Text: Genre Name
    content
      .append('text')
      .text((d) => d.genre.name)
      .attr('dy', '-0.2em')
      .attr('text-anchor', 'middle')
      .attr('class', 'font-serif font-bold pointer-events-none')
      .style('fill', '#FFFFFF')
      .style('text-shadow', '0px 1px 3px rgba(0,0,0,0.3)')
      .style('font-size', (d) => {
        const base = d.r / 3.5;
        const length = d.genre.name.length;
        if (length > 12) return `${base * 0.85}px`;
        if (length > 8) return `${base * 0.9}px`;
        return `${base}px`;
      });

    // Combined Metadata (Rating + Count)
    const metaSize = (d: BubbleNode) => d.r / 5.5;

    content
      .append('foreignObject')
      .attr('width', (d) => d.r * 1.8)
      .attr('height', (d) => d.r * 0.5)
      .attr('x', (d) => -d.r * 0.9)
      .attr('y', (d) => d.r * 0.1)
      .style('pointer-events', 'none')
      .append('xhtml:div')
      .style('width', '100%')
      .style('height', '100%')
      .attr('class', 'flex items-center justify-center gap-3 text-white opacity-90')
      .style('font-size', (d) => `${metaSize(d)}px`)
      .style('text-shadow', '0px 1px 2px rgba(0,0,0,0.3)')
      .html(
        (d) => `
           <span class="font-serif font-semibold">★ ${d.genre.userAvgRating.toFixed(1)}</span>
           <div class="w-px h-3 bg-white/40"></div>
           <div class="flex items-center gap-1">
             ${renderToStaticMarkup(<Film size="1em" strokeWidth={2.5} />)}
             <span class="font-sans font-medium leading-none mt-[1px]">${d.genre.userWatchCount}</span>
           </div>
      `,
      );

    // Update simulation positions with Bounding Box
    simulation.on('tick', () => {
      nodeContainers.attr('transform', (d) => {
        // Hard Clamp to Screen Boundaries
        const r = d.r;
        // X: [r + padding, width - r - padding]
        d.x = Math.max(r + screenPadding, Math.min(width - r - screenPadding, d.x!));
        // Y: [r, height - r] (keep vertical strict but padding less critical unless desired)
        d.y = Math.max(r, Math.min(height - r, d.y!));

        return `translate(${d.x},${d.y})`;
      });
    });

    // Clean up
    return () => {
      simulation.stop();
    };
  }, [dimensions, nodes, getGenreBaseColor, minRating, maxRating]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden bg-[#F8F5F2] flex flex-col items-center"
      onClick={() => setHoveredGenre(null)} // Click outside to close
      style={{ fontFamily: 'var(--font-sans)' }}
    >
      {/* Header / Intro Line */}
      <div className="absolute top-8 left-0 right-0 text-center pointer-events-none z-10 px-4">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#2D2D2D] mb-2">
          Your Genre Landscape
        </h1>
        <div className="flex justify-center gap-6 text-sm text-[#666]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#E76F51]"></span>
            Brighter = Higher Rated
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full border border-gray-400"></span>
            Bigger = More Watched
          </span>
        </div>
      </div>

      <svg ref={svgRef} width="100%" height="100%" className="touch-none" />

      {/* Helper Interaction Hint */}
      <div className="absolute bottom-6 left-0 right-0 text-center text-[#999] text-xs pointer-events-none">
        Hover or tap a bubble to explore
      </div>

      {/* Poster Strip Overlay */}
      <AnimatePresence>
        {hoveredGenre && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              zIndex: 50,
            }}
          >
            <div
              style={{
                position: 'absolute',
                // Smart Clamping: Keep strip within screen bounds
                left: (() => {
                  const isMobile = dimensions.width < 768;
                  const halfStripWidth = isMobile ? 140 : 210;
                  const padding = 20;
                  return Math.max(
                    halfStripWidth + padding,
                    Math.min(hoveredGenre.x, dimensions.width - halfStripWidth - padding),
                  );
                })(),
                top: hoveredGenre.y,
              }}
            >
              <BubblePosterStrip
                movies={hoveredGenre.genre.exampleMovies}
                bubbleRadius={hoveredGenre.r}
                isMobile={dimensions.width < 768}
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
