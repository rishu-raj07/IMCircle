function Shimmer({ className = "" }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-[var(--imc-surface-2)] ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[imc-shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10" />
    </div>
  );
}

export function FeedSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-[22px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4"
        >
          <div className="flex gap-3">
            <Shimmer className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Shimmer className="h-4 w-32" />
              <Shimmer className="h-3 w-44" />
            </div>
          </div>
          <Shimmer className="mt-4 h-4 w-11/12" />
          <Shimmer className="mt-2 h-4 w-7/12" />
          <Shimmer className="mt-4 aspect-[4/3] w-full rounded-[18px]" />
          <div className="mt-4 flex justify-between">
            <Shimmer className="h-8 w-16 rounded-full" />
            <Shimmer className="h-8 w-16 rounded-full" />
            <Shimmer className="h-8 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HomePageSkeleton() {
  return (
    <div className="space-y-4">
      <div
        className="rounded-[22px] border p-4"
        style={{
          background: "var(--imc-surface)",
          borderColor: "var(--imc-border)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shimmer className="h-10 w-10 rounded-[14px]" />
            <div className="space-y-2">
              <Shimmer className="h-3 w-24 rounded-full" />
              <Shimmer className="h-3 w-44 rounded-full" />
            </div>
          </div>
          <Shimmer className="h-10 w-10 rounded-full" />
        </div>
      </div>

      <div>
        <Shimmer className="mb-3 h-4 w-44 rounded-full" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="flex min-w-[58px] flex-col items-center">
              <Shimmer className="h-[54px] w-[54px] rounded-full" />
              <Shimmer className="mt-2 h-2.5 w-12 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <div
        className="overflow-hidden rounded-[22px] border"
        style={{
          background: "var(--imc-surface)",
          borderColor: "var(--imc-border)",
        }}
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shimmer className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Shimmer className="h-3 w-28 rounded-full" />
                <Shimmer className="h-3 w-20 rounded-full" />
              </div>
            </div>
            <Shimmer className="h-8 w-20 rounded-full" />
          </div>
          <Shimmer className="mt-4 h-4 w-56 rounded-full" />
        </div>
        <Shimmer className="aspect-[4/3] w-full rounded-none" />
        <div className="p-4">
          <div className="grid grid-cols-4 gap-3">
            <Shimmer className="h-7 rounded-full" />
            <Shimmer className="h-7 rounded-full" />
            <Shimmer className="h-7 rounded-full" />
            <Shimmer className="h-7 rounded-full" />
          </div>
          <Shimmer className="mt-4 h-9 w-full rounded-full" />
        </div>
      </div>

      <FeedSkeleton count={2} />
    </div>
  );
}

export function JourneySkeleton() {
  return (
    <div className="rounded-[22px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Shimmer className="h-3 w-28" />
          <Shimmer className="h-5 w-40" />
        </div>
        <Shimmer className="h-11 w-11 rounded-full" />
      </div>
      <Shimmer className="mt-3 h-2 w-full rounded-full" />
      <Shimmer className="mt-4 h-52 w-full rounded-[18px]" />
    </div>
  );
}

export function StorySkeleton({ count = 6 }) {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex min-w-[64px] flex-col items-center">
          <Shimmer className="h-[56px] w-[56px] rounded-full" />
          <Shimmer className="mt-2 h-3 w-12 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export const ProfileSkeleton = FeedSkeleton;
export const CommunitySkeleton = FeedSkeleton;
export const MessageSkeleton = FeedSkeleton;
export const NotificationSkeleton = FeedSkeleton;
export const CommentSkeleton = FeedSkeleton;
export const AnalyticsSkeleton = FeedSkeleton;
export const SearchSkeleton = FeedSkeleton;
export const LearningSkeleton = FeedSkeleton;
export const UserCardSkeleton = FeedSkeleton;

export default Shimmer;
