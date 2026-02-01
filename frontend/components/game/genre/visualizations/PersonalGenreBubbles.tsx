'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { X, Film } from 'lucide-react'; // Corrected FilmIcon to Film

import * as d3 from 'd3';
import { MOCK_GENRE_DATA, GenreData } from './mockData';
import { AnimatePresence, motion } from 'framer-motion';

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
  const [selectedGenre, setSelectedGenre] = useState<GenreData | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // 1. Normalize Data
  const { nodes, getGenreBaseColor, minRating, maxRating } = useMemo(() => {
    // Filter for user data only (just in case)
    const data = MOCK_GENRE_DATA.filter((g) => g.userWatchCount > 0);

    // Rating Range for Color Intensity
    const minRating = d3.min(data, (d) => d.userAvgRating) || 0;
    const maxRating = d3.max(data, (d) => d.userAvgRating) || 5;

    // Watch Count Range for Size
    const minCount = d3.min(data, (d) => d.userWatchCount) || 0;
    const maxCount = d3.max(data, (d) => d.userWatchCount) || 100;

    // Color Mapping
    // Single Base Color: Earthy Terracotta/Orange
    // We will vary saturation/lightness based on rating.
    const BASE_COLOR = '#E76F51';

    const getGenreBaseColor = (_id: string) => BASE_COLOR;

    // Size Scale
    const radiusScale = d3.scaleSqrt().domain([minCount, maxCount]).range([60, 140]);

    // Sort data by rating descending so highest rated are processed first/center
    data.sort((a, b) => b.userAvgRating - a.userAvgRating);

    const nodes: BubbleNode[] = data.map((d, i) => {
      // Initialize high-rated items closer to center (which will be dynamic, but let's give them a relative starting point)
      // We'll trust the simulation to center them, but sorting helps.
      // We can also assign 'r' here.
      return {
        id: d.id,
        r: radiusScale(d.userWatchCount),
        x: Math.cos(i) * i * 5, // Spiral initialization hint
        y: Math.sin(i) * i * 5,
        genre: d,
      };
    });

    return { nodes, getGenreBaseColor, minRating, maxRating };
  }, []);

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
    svg.selectAll('*').remove(); // Clear previous

    const width = dimensions.width;
    const height = dimensions.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const g = svg.append('g');

    // Forces
    // Radial Layout: High rating (center) -> Low rating (edges)

    // Calculate tighter packing radius based on actual bubble area
    // A ideal packed circle Area = Sum(PI * r^2)
    const totalArea = nodes.reduce((acc, node) => acc + Math.PI * Math.pow(node.r + 5, 2), 0);
    const packedRadius = Math.sqrt(totalArea / Math.PI);

    // Add a small buffer (e.g. 10%) so they aren't squeezed too hard, but stay together
    // This ensures low rated items orbit just at the edge of the cluster, not at screen edge
    const maxOrbitRadius = packedRadius * 1.1;

    const simulation = d3
      .forceSimulation<BubbleNode>(nodes)
      .force('charge', d3.forceManyBody().strength(-5)) // Negative charge to prevent overlap clumping locally
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
              const targetR = (1 - normalized) * maxOrbitRadius;
              return targetR;
            },
            centerX,
            centerY,
          )
          .strength((d) => {
            // Stronger pull for the very top rated items to ensure they sit in the middle
            const normalized = (d.genre.userAvgRating - minRating) / (maxRating - minRating || 1);
            // Boost strength for top rated items significantly
            return 0.6 + normalized * 0.6; // 0.6 to 1.2 strength
          }),
      ); // Strength determines how strictly they adhere to the ring

    // CONTAINER GROUP (Moves with Simulation)
    const nodeContainers = g
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'cursor-pointer') // Removed hover:scale here to avoid conflict
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedGenre(d.genre);
      });

    // CONTENT GROUP (Scales on Hover)
    // We nest an internal group 'content' to handle the scaling transformation separately from position
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
          // Normalize rating (0 to 1)
          const normalized = (d.genre.userAvgRating - minRating) / (maxRating - minRating || 1);

          // Vibrant Saturation Adjustment
          // High rating (1) -> Boost saturation significantly (up to 1.3x original, capped at 1.0)
          // Low rating (0) -> Keep muted (~40% saturation)
          base.s = Math.min(1, base.s * (0.4 + 0.9 * Math.pow(normalized, 1.4)));

          // Lighter lightening effect
          base.l = Math.min(0.9, base.l + (1 - normalized) * 0.05);

          return base.formatHex();
        }
        return '#ccc';
      })
      .attr('fill-opacity', (d) => {
        // Map rating to opacity: 3.0 -> 0.75, 5.0 -> 1.0
        // More visible even at low ratings
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
      .attr('dy', '-0.2em') // Moved to center-ish top
      .attr('text-anchor', 'middle')
      .attr('class', 'font-serif font-bold pointer-events-none') 
      .style('fill', '#FFFFFF')
      .style('text-shadow', '0px 1px 3px rgba(0,0,0,0.3)')
      .style('font-size', (d) => {
        // Dynamic font size: shrink if name is long
        const base = d.r / 3.5;
        const length = d.genre.name.length;
        if (length > 12) return `${base * 0.85}px`;
        if (length > 8) return `${base * 0.9}px`;
        return `${base}px`;
      });

    // Combined Metadata (Rating + Count)
    // We group them to keep them together visually
    const metaSize = (d: BubbleNode) => d.r / 5.5; 

    content
      .append('foreignObject')
      .attr('width', (d) => d.r * 1.8)
      .attr('height', (d) => d.r * 0.5)
      .attr('x', (d) => -d.r * 0.9)
      .attr('y', (d) => d.r * 0.1) // Position below title
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

    // Update simulation positions on the CONTAINER group, not the content group.
    simulation.on('tick', () => {
      nodeContainers.attr('transform', (d) => `translate(${d.x},${d.y})`);
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
      onClick={() => setSelectedGenre(null)} // Click outside to close
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
        Tap a bubble to explore
      </div>

      {/* Poster Strip Overlay */}
      <AnimatePresence>
        {selectedGenre && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-16 md:bottom-12 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl z-20 max-w-[90vw] w-auto border border-white/50"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-lg font-bold text-[#2D2D2D]">{selectedGenre.name}</h3>
              <button
                onClick={() => setSelectedGenre(null)}
                className="p-1 rounded-full hover:bg-black/5 text-[#666]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {selectedGenre.exampleMovies.map((movie, i) => (
                <div key={i} className="flex-shrink-0 w-24 md:w-28 flex flex-col gap-1">
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xs text-[#444] font-medium truncate w-full text-center">
                    {movie.title}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
