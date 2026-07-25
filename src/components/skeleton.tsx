import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("tf-skeleton rounded-sm", className)} />;
}

export function SofaCardSkeleton() {
  return (
    <div className="block">
      <Skeleton className="aspect-[4/5] w-full mb-6" />
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export function CollectionsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12">
      {Array.from({ length: 6 }).map((_, i) => (
        <SofaCardSkeleton key={i} />
      ))}
    </div>
  );
}