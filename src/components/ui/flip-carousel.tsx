"use client";

import { useState, useRef, useCallback } from "react";
import gsap from "gsap";

export interface CardItem {
  imgUrl: string;
  alt?: string;
}

interface FlipCarouselProps {
  cards: CardItem[];
  onImageClick?: (index: number) => void;
}

const ARROW_CLASSES =
  "relative flex items-center justify-center rounded-full border-[1.5px] border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-[16px] text-black/40 dark:text-white/55 cursor-pointer shrink-0 z-30 outline-none shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:border-black/25 dark:hover:border-white/25 hover:text-black/70 dark:hover:text-white/80 active:opacity-70 transition-colors duration-300 disabled:opacity-30 disabled:pointer-events-none";

export default function FlipCarousel({ cards, onImageClick }: FlipCarouselProps) {
  const [index, setIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const isAnimating = useRef(false);

  const total = cards.length;

  const goTo = useCallback(
    (nextIndex: number, direction: "left" | "right") => {
      if (isAnimating.current || !cardRef.current || nextIndex === index) return;
      isAnimating.current = true;

      const el = cardRef.current;
      const rotateOut = direction === "right" ? -90 : 90;
      const rotateIn = direction === "right" ? 90 : -90;

      gsap.to(el, {
        rotationY: rotateOut,
        opacity: 0,
        duration: 0.25,
        ease: "power1.in",
        onComplete: () => {
          setIndex(nextIndex);
          gsap.fromTo(
            el,
            { rotationY: rotateIn, opacity: 0 },
            {
              rotationY: 0,
              opacity: 1,
              duration: 0.35,
              ease: "power2.out",
              onComplete: () => {
                isAnimating.current = false;
              },
            }
          );
        },
      });
    },
    [index]
  );

  const next = () => goTo((index + 1) % total, "right");
  const prev = () => goTo((index - 1 + total) % total, "left");

  if (!total) return null;

  const chevron = (direction: "left" | "right") => (
    <svg
      className="relative z-[2] w-4 h-4 md:w-5 md:h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points={direction === "left" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
    </svg>
  );

  return (
    <section className="flex flex-col items-center w-full py-4 lg:py-8 px-4 md:px-8">
      <div className="flex items-center gap-4 md:gap-6">
        <button className={`${ARROW_CLASSES} w-10 h-10 md:w-12 md:h-12`} onClick={prev} disabled={total <= 1} aria-label="Previous photo">
          {chevron("left")}
        </button>

        <div style={{ perspective: "1200px" }} className="w-56 h-80 md:w-64 md:h-96">
          <div
            ref={cardRef}
            className="w-full h-full rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.18)] bg-card"
            style={{ transformStyle: "preserve-3d" }}
          >
            <img
              src={cards[index].imgUrl}
              alt={cards[index].alt || `Photo ${index + 1}`}
              className={`w-full h-full object-cover ${onImageClick ? "cursor-zoom-in" : ""}`}
              onClick={() => onImageClick?.(index)}
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <button className={`${ARROW_CLASSES} w-10 h-10 md:w-12 md:h-12`} onClick={next} disabled={total <= 1} aria-label="Next photo">
          {chevron("right")}
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 mt-4 md:mt-6">
        <span className="text-sm opacity-60 font-medium">
          {index + 1} / {total}
        </span>
      </div>
    </section>
  );
}
