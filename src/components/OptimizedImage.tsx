import { useState, useCallback, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'onLoad' | 'onError'> {
  /** Source URL of the image */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Fallback image URL if main image fails to load */
  fallback?: string;
  /** Placeholder while loading (blur, skeleton, or custom URL) */
  placeholder?: 'blur' | 'skeleton' | string;
  /** Additional class names */
  className?: string;
  /** Container class names */
  containerClassName?: string;
  /** Aspect ratio for container (e.g., "16/9", "1/1", "4/3") */
  aspectRatio?: string;
  /** Callback when image loads successfully */
  onLoaded?: () => void;
  /** Callback when image fails to load */
  onFailed?: () => void;
}

const DEFAULT_FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="12" x="50%" y="50%" text-anchor="middle" dy=".3em"%3EImagem%3C/text%3E%3C/svg%3E';

/**
 * Optimized image component with lazy loading, placeholders, and fallbacks
 */
export function OptimizedImage({
  src,
  alt,
  fallback = DEFAULT_FALLBACK,
  placeholder = 'skeleton',
  className,
  containerClassName,
  aspectRatio,
  onLoaded,
  onFailed,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoaded?.();
  }, [onLoaded]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    setCurrentSrc(fallback);
    onFailed?.();
  }, [fallback, onFailed]);

  // Generate placeholder styles
  const getPlaceholderStyles = () => {
    if (!isLoading) return {};
    
    if (placeholder === 'blur') {
      return {
        filter: 'blur(10px)',
        transform: 'scale(1.05)',
      };
    }
    
    return {};
  };

  const containerStyles = aspectRatio
    ? { aspectRatio }
    : {};

  return (
    <div 
      className={cn(
        "relative overflow-hidden",
        containerClassName
      )}
      style={containerStyles}
    >
      {/* Loading skeleton */}
      {isLoading && placeholder === 'skeleton' && (
        <div 
          className="absolute inset-0 animate-pulse bg-muted"
          aria-hidden="true"
        />
      )}
      
      {/* Main image */}
      <img
        src={hasError ? fallback : currentSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className
        )}
        style={getPlaceholderStyles()}
        {...props}
      />
    </div>
  );
}

/**
 * Avatar-specific optimized image
 */
export function OptimizedAvatar({
  src,
  alt,
  size = 'md',
  className,
  ...props
}: OptimizedImageProps & {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  };

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      containerClassName={cn("rounded-full", sizeClasses[size])}
      className={cn("h-full w-full object-cover rounded-full", className)}
      placeholder="skeleton"
      {...props}
    />
  );
}

/**
 * Card image with aspect ratio
 */
export function OptimizedCardImage({
  src,
  alt,
  className,
  ...props
}: OptimizedImageProps) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      aspectRatio="16/9"
      containerClassName="rounded-t-lg"
      className={cn("h-full w-full object-cover", className)}
      placeholder="skeleton"
      {...props}
    />
  );
}
