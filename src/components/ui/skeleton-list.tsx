import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonListProps {
  count?: number;
  className?: string;
}

/**
 * Skeleton for a list of cards (barbers, services, etc.)
 */
export function SkeletonCardList({ count = 3, className }: SkeletonListProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
          <Skeleton className="h-32 w-full rounded-md" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for barber cards
 */
export function SkeletonBarberList({ count = 4, className }: SkeletonListProps) {
  return (
    <div className={cn("grid gap-4 grid-cols-2 md:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center space-y-2 p-3">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for service list items
 */
export function SkeletonServiceList({ count = 5, className }: SkeletonListProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for calendar/schedule view
 */
export function SkeletonCalendar({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Week day headers */}
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-6 w-full" />
        ))}
        
        {/* Calendar days */}
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={`day-${i}`} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for time slots
 */
export function SkeletonTimeSlots({ count = 8, className }: SkeletonListProps) {
  return (
    <div className={cn("grid grid-cols-4 gap-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-md" />
      ))}
    </div>
  );
}

/**
 * Skeleton for a table
 */
export function SkeletonTable({ rows = 5, cols = 4, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div className="flex gap-4 pb-2 border-b">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-2">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for dashboard stats
 */
export function SkeletonStats({ count = 4, className }: SkeletonListProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}
