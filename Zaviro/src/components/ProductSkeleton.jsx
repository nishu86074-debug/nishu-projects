function ProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="h-56 w-full animate-pulse bg-gray-200" />

      <div className="p-4">
        <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />

        <div className="mt-3 h-5 w-full animate-pulse rounded bg-gray-200" />

        <div className="mt-2 h-5 w-2/3 animate-pulse rounded bg-gray-200" />

        <div className="mt-4 h-4 w-24 animate-pulse rounded bg-gray-200" />

        <div className="mt-4 h-6 w-28 animate-pulse rounded bg-gray-200" />

        <div className="mt-5 h-10 w-full animate-pulse rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}

export default ProductSkeleton;