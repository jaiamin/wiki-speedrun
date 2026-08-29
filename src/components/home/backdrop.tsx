"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { titleToPath } from "@/lib/wiki/titles";
import {
  BACKDROP_NODES,
  placeBackdropWords,
  type BackdropPosition,
} from "./backdrop-layout";

export function Backdrop({ terms }: { terms: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [positions, setPositions] = useState<
    Array<BackdropPosition | null>
  >([]);

  const layout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = wordRefs.current.flatMap((word, index) => {
      if (!word) return [];

      const radians = (BACKDROP_NODES[index].tilt * Math.PI) / 180;
      const cosine = Math.abs(Math.cos(radians));
      const sine = Math.abs(Math.sin(radians));
      const width = word.offsetWidth * cosine + word.offsetHeight * sine;
      const height = word.offsetWidth * sine + word.offsetHeight * cosine;

      return [{ index, width, height }];
    });

    const nextPositions = placeBackdropWords(
      items,
      container.clientWidth,
      container.clientHeight,
    );
    setPositions(nextPositions);
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    layout();
    let frame = 0;
    const queueLayout = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(layout);
    };
    const observer = new ResizeObserver(queueLayout);
    observer.observe(container);
    for (const word of wordRefs.current) {
      if (word) observer.observe(word);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [layout]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-backdrop select-none"
    >
      {BACKDROP_NODES.map((node, index) => {
        const term = terms[index];
        if (!term) return null;
        const position = positions[index];

        return (
          <a
            key={`${term}-${index}`}
            ref={(element) => {
              wordRefs.current[index] = element;
            }}
            href={`https://en.wikipedia.org/wiki/${titleToPath(term)}`}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={position ? undefined : -1}
            className="backdrop-term text-backdrop-ink pointer-events-auto absolute font-bold whitespace-nowrap"
            style={
              {
                left: position ? `${position.left}px` : 0,
                top: position ? `${position.top}px` : 0,
                visibility: position ? "visible" : "hidden",
                "--term-size": node.size,
                "--term-tilt": `${node.tilt}deg`,
              } as React.CSSProperties
            }
          >
            {term}
          </a>
        );
      })}
    </div>
  );
}
