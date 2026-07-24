import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/cn';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  aspectRatio?: string;
  containerClassName?: string;
}

export function LazyImage({
  src,
  alt,
  fallback,
  aspectRatio,
  containerClassName,
  className,
  ...props
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '200px' },
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden bg-surface-muted', containerClassName)}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {!loaded && !errored && (
        <div className="absolute inset-0 shimmer" />
      )}
      {inView && !errored && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={cn(
            'w-full h-full transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
            className,
          )}
          loading="lazy"
          decoding="async"
          {...props}
        />
      )}
      {errored && fallback && (
        <img src={fallback} alt={alt} className={cn('w-full h-full', className)} />
      )}
      {errored && !fallback && (
        <div className="absolute inset-0 flex items-center justify-center text-content-subtle text-xs">
          Image unavailable
        </div>
      )}
    </div>
  );
}
