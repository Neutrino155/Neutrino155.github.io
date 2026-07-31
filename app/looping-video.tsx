"use client";

import { useEffect, useRef } from "react";

type LoopingVideoProps = {
  ariaLabel: string;
  poster: string;
  preload?: "auto" | "metadata";
  src: string;
};

export function LoopingVideo({
  ariaLabel,
  poster,
  preload = "metadata",
  src,
}: LoopingVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void video.play().catch(() => {
            // The poster remains visible if a browser blocks autoplay.
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.05 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      aria-label={ariaLabel}
      autoPlay
      loop
      muted
      playsInline
      poster={poster}
      preload={preload}
      ref={videoRef}
      src={src}
    />
  );
}
