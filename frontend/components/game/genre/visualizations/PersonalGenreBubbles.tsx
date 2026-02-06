'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Film, Sparkles as SparklesIcon } from 'lucide-react';
import * as d3 from 'd3';
import { GenreStat, GenreInsight } from '@/lib/api';
import { AnimatePresence, motion } from 'framer-motion';
import { BubblePosterStrip } from './BubblePosterStrip';

interface BubbleNode extends d3.SimulationNodeDatum {
  id: string;
  genre: GenreStat;
  r: number;
  x?: number;
  y?: number;
}

interface PersonalGenreBubblesProps {
  data: GenreStat[];
  insights?: GenreInsight[];
}

export function PersonalGenreBubbles({ data, insights }: PersonalGenreBubblesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const svgWrapperRef = useRef<HTMLDivElement>(null);
  const [hoveredGenre, setHoveredGenre] = useState<{
    genre: GenreStat;
    x: number;
    y: number;
    r: number;
  } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // 1. Normalize Data
  const { nodes, getGenreBaseColor, minRating, maxRating } = useMemo(() => {
    // Filter for user data only
    const validData = data.filter((g) => g.userWatchCount > 0);

    // Rating Range for Color Intensity
    const minRating = d3.min(validData, (d) => d.userAvgRating) || 0;
    const maxRating = d3.max(validData, (d) => d.userAvgRating) || 5;

    // Watch Count Range for Size
    const minCount = d3.min(validData, (d) => d.userWatchCount) || 0;
    const maxCount = d3.max(validData, (d) => d.userWatchCount) || 100;

    // Color Mapping
    const BASE_COLOR = '#E76F51';

    const getGenreBaseColor = (_id: string) => BASE_COLOR;

    // Size Scale
    const isMobile = dimensions.width > 0 && dimensions.width < 768;
    // Tighter radius range to ensure fitting on small screens
    const radiusRange: [number, number] = isMobile ? [20, 60] : [50, 120];
    const radiusScale = d3.scaleSqrt().domain([minCount, maxCount]).range(radiusRange);

    // Sort data by rating descending
    validData.sort((a, b) => b.userAvgRating - a.userAvgRating);

    const nodes: BubbleNode[] = validData.map((d, i) => {
      return {
        id: d.id,
        r: radiusScale(d.userWatchCount),
        x: Math.cos(i) * i * 5,
        y: Math.sin(i) * i * 5,
        genre: d,
      };
    });

    return { nodes, getGenreBaseColor, minRating, maxRating };
  }, [data, dimensions.width]);

  // 2. Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: svgWrapperRef.current?.clientHeight || window.innerHeight,
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
    const centerY = height / 2;

    const g = svg.append('g');

    // Forces
    const totalArea = nodes.reduce((acc, node) => acc + Math.PI * Math.pow(node.r + 5, 2), 0);
    const packedRadius = Math.sqrt(totalArea / Math.PI);

    // Ensure the target orbit fits within the screen
    // Note: radiusRange is [20, 60] for mobile, [50, 120] for desktop
    const maxBubbleR = isMobile ? 60 : 120;
    const minDimensionHalf = Math.min(width, height) / 2;

    // Add extra padding for mobile to prevent edge touching
    const screenPadding = isMobile ? 15 : 0;

    // Cap the orbit radius so the outer edge of bubbles stays inside:
    // Available Space = minDimensionHalf - maxBubbleR - padding
    const safeOrbitRadius = Math.max(0, minDimensionHalf - maxBubbleR - screenPadding - 10);

    // Use the smaller of the ideal packed size or the safe screen limit
    // Use the smaller of the ideal packed size or the safe screen limit
    const maxOrbitRadius = Math.min(packedRadius * 1.1, safeOrbitRadius);

    const simulation = d3
      .forceSimulation<BubbleNode>(nodes)
      .force('charge', d3.forceManyBody().strength(-5))
      .force(
        'collide',
        d3
          .forceCollide<BubbleNode>()
          .radius((d) => d.r + 1) // Tighter collision radius
          .strength(1) // Stiffer collision to prevent overlap
          .iterations(3),
      )
      .force(
        'radial',
        d3
          .forceRadial<BubbleNode>(
            (d) => {
              const normalized = (d.genre.userAvgRating - minRating) / (maxRating - minRating || 1);
              // Invert normalized: High rating (1.0) -> inner center (0)
              // Low rating (0.0) -> outer edge (maxOrbitRadius)
              const targetR = Math.pow(1 - normalized, 1.5) * maxOrbitRadius; // steeper power curve
              return targetR;
            },
            centerX,
            centerY,
          )
          .strength((d) => {
            const normalized = (d.genre.userAvgRating - minRating) / (maxRating - minRating || 1);
            // Much stronger pull for high rated items to force them to center
            return 1.0 + normalized * 1.0; // Range 1.0 - 2.0
          }),
      )
      .stop(); // STOP immediately to pre-calculate

    // ------------------------------------------------------------
    // PRE-CALCULATION (Warm Up) to avoid initial "flicker"
    // ------------------------------------------------------------
    const TICKS = 300;
    for (let i = 0; i < TICKS; ++i) {
      simulation.tick();
      // Manually clamp during warmup to ensure they settle in bounds
      nodes.forEach((d) => {
        const r = d.r;
        d.x = Math.max(r + screenPadding, Math.min(width - r - screenPadding, d.x!));
        d.y = Math.max(r, Math.min(height - r, d.y!));
      });
    }

    // CONTAINER GROUP
    const nodeContainers = g
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'cursor-pointer')
      // Set initial position based on warmed-up coordinates
      .attr('transform', (d) => `translate(${d.x},${d.y}) scale(0)`) // Start scaled down
      .attr('opacity', 0)
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

    // ENTRANCE ANIMATION
    nodeContainers
      .transition()
      .duration(800)
      .ease(d3.easeBackOut.overshoot(0.8)) // Nice bounce effect
      .delay((d, i) => i * 15) // Staggered reveal
      .attr('transform', (d) => `translate(${d.x},${d.y}) scale(1)`)
      .attr('opacity', 1)
      .on('end', () => {
        // Optional: Restart simulation gently if we want floating,
        // but for "stable" look, we might just leave them unless dragged (if we had drag)
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

          // Boost mid-tier saturation significantly (User Feedback: "still too gray")
          // Normalized 0 -> Saturation 0.3 (grey-ish but still hinted)
          // Normalized 0.5 -> Saturation ~0.75 (vibrant enough)
          // Normalized 1 -> Saturation 1.0 (full color)
          // Using power < 1 (e.g. 0.7) to boost the curve upwards for mid-values
          base.s = Math.min(1, base.s * (0.3 + 0.7 * Math.pow(normalized, 0.7)));

          // Lightness adjustment: minimal fading for low ratings to keep color depth
          base.l = Math.min(0.9, base.l + (1 - normalized) * 0.05);

          return base.formatHex();
        }
        return '#ccc';
      })
      .attr('fill-opacity', (d) => {
        const normalized = (d.genre.userAvgRating - minRating) / (maxRating - minRating || 1);
        // Lower opacity for low rated items
        return 0.6 + normalized * 0.4;
      })
      .attr('stroke', (d) => {
        // Darker stroke for high rated, lighter for low rated
        const normalized = (d.genre.userAvgRating - minRating) / (maxRating - minRating || 1);
        return normalized > 0.5 ? '#fff' : '#ddd';
      })
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

    // Clean up
    return () => {
      simulation.stop();
    };
  }, [dimensions, nodes, getGenreBaseColor, minRating, maxRating]);



  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-screen overflow-hidden bg-[#F8F5F2] flex flex-col items-center"
      onClick={() => setHoveredGenre(null)} // Click outside to close
      style={{ fontFamily: 'var(--font-sans)' }}
    >
      {/* Header / Intro Line */}
      <div className="relative shrink-0 pt-6 md:pt-10 z-10 px-4 flex flex-col items-center gap-2 md:gap-4 pointer-events-none w-full max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#2D2D2D] drop-shadow-sm">
          Your Genre Landscape
        </h1>
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-sm md:text-lg font-medium text-[#555]">
          <span className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm border border-white/20">
            <span className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-[#E76F51] shadow-inner"></span>
            Brighter = Higher Rated
          </span>
          <span className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm border border-white/20">
            <span className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-transparent border-2 border-gray-400"></span>
            Bigger = More Watched
          </span>
        </div>

        {/* Dynamic Insights */}
        <div className="flex flex-col gap-2 w-full max-w-lg items-center mt-2">
          <AnimatePresence>
            {insights?.map((insight, index) => (
              <motion.div
                key={insight.type + index}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 1.5 + index * 0.2, type: 'spring' }}
                className="w-full bg-white/90 backdrop-blur-xl px-5 py-3 rounded-2xl text-center shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-[#E76F51]/10"
              >
                <div className="flex items-center justify-center gap-2 text-[#E76F51] uppercase tracking-widest text-[10px] md:text-xs font-bold mb-0.5">
                  <SparklesIcon className="w-3 h-3" />
                  {insight.type}
                  <SparklesIcon className="w-3 h-3" />
                </div>
                <p className="text-[#333] text-sm md:text-base font-medium leading-relaxed">
                  {insight.text}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div ref={svgWrapperRef} className="flex-1 w-full relative min-h-0">
        <svg ref={svgRef} width="100%" height="100%" className="touch-none absolute inset-0" />
      </div>

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
