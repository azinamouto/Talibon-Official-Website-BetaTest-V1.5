import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LayoutGrid, Rows3, Search } from "lucide-react";
import { INITIAL_BARANGAYS } from "../services/cmsService";

type ViewMode = "grid" | "list";

const PREVIEW_LIMIT = 15;

export default function BarangaySelector() {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const normalizedQuery = query.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;
  const totalBarangays = INITIAL_BARANGAYS.length;

  const visibleBarangays = useMemo(() => {
    const source = isSearching
      ? INITIAL_BARANGAYS
      : INITIAL_BARANGAYS.slice(0, PREVIEW_LIMIT);

    return source.filter((barangay) =>
      barangay.name.toLowerCase().includes(normalizedQuery),
    );
  }, [isSearching, normalizedQuery]);

  return (
    <section
      id="barangays"
      aria-labelledby="barangays-heading"
      className="border-t border-brand-border/70 bg-brand-bg py-12 sm:py-16 lg:py-20"
    >
      <div className="mx-auto w-full max-w-[1680px] px-5 sm:px-8 lg:px-10 2xl:px-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-10">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-7 bg-brand-primary" aria-hidden="true" />
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-primary">
                Talibon, Bohol / Communities
              </p>
            </div>

            <h2
              id="barangays-heading"
              className="font-display text-3xl font-bold tracking-tight text-brand-text sm:text-4xl lg:text-5xl"
            >
              Our barangays
            </h2>
          </div>

          <div className="space-y-4 lg:pt-1">
            <p className="text-sm leading-7 text-brand-muted sm:text-base">
              Explore the communities that make up Talibon. Search by barangay
              name, or visit the directory for more information.
            </p>
            <p className="text-sm font-medium text-brand-muted sm:text-base">
              <span className="mr-1 font-display text-2xl font-bold text-brand-text">
                {totalBarangays}
              </span>
              barangays in the municipality
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-brand-border pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
              <label className="relative block w-full sm:max-w-md">
                <span className="sr-only">Search for a barangay</span>
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search for a barangay"
                  className="form-input rounded-xl py-3 pl-11 pr-4 text-sm font-medium"
                />
              </label>

              <div
                className="inline-flex w-fit items-center rounded-xl border border-brand-border bg-white p-1"
                role="group"
                aria-label="Barangay list view options"
              >
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-pressed={viewMode === "grid"}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    viewMode === "grid"
                      ? "bg-brand-primary text-white"
                      : "text-brand-text hover:bg-brand-primary/5"
                  }`}
                >
                  <LayoutGrid size={15} aria-hidden="true" />
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  aria-pressed={viewMode === "list"}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    viewMode === "list"
                      ? "bg-brand-primary text-white"
                      : "text-brand-text hover:bg-brand-primary/5"
                  }`}
                >
                  <Rows3 size={15} aria-hidden="true" />
                  List
                </button>
              </div>
            </div>

            <p className="text-sm font-medium text-brand-muted lg:text-right">
              {isSearching
                ? `Found ${visibleBarangays.length} of ${totalBarangays} barangays`
                : `Showing ${visibleBarangays.length} of ${totalBarangays} barangays`}
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-brand-border bg-brand-border">
          {visibleBarangays.length > 0 ? (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 gap-px md:grid-cols-2 xl:grid-cols-3"
                  : "grid grid-cols-1 gap-px"
              }
            >
              {visibleBarangays.map((barangay, index) => {
                const sequence = isSearching
                  ? INITIAL_BARANGAYS.findIndex((item) => item.id === barangay.id) + 1
                  : index + 1;

                return (
                  <Link
                    key={barangay.id}
                    to="/about/barangays"
                    className={`group bg-white transition-colors duration-200 hover:bg-brand-primary/[0.04] focus-visible:relative focus-visible:z-10 focus-visible:bg-brand-primary/[0.04] ${
                      viewMode === "grid"
                        ? "min-h-[138px] px-5 py-5 sm:px-6 sm:py-6"
                        : "px-5 py-4 sm:px-6"
                    }`}
                    aria-label={`Open barangay directory including ${barangay.name}`}
                  >
                    {viewMode === "grid" ? (
                      <div className="flex h-full flex-col justify-between gap-6">
                        <div className="flex items-start justify-between gap-4">
                          <span
                            className="font-mono text-xs font-medium tracking-[0.18em] text-brand-primary"
                            aria-hidden="true"
                          >
                            {String(sequence).padStart(2, "0")}
                          </span>
                          <ArrowRight
                            size={18}
                            className="text-brand-primary/65 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-brand-primary"
                            aria-hidden="true"
                          />
                        </div>

                        <div>
                          <h3 className="font-display text-xl font-semibold tracking-tight text-brand-text sm:text-[22px]">
                            {barangay.name}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-brand-muted">
                            View barangay information and directory details.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-4">
                          <span
                            className="w-8 shrink-0 font-mono text-xs font-medium tracking-[0.18em] text-brand-primary"
                            aria-hidden="true"
                          >
                            {String(sequence).padStart(2, "0")}
                          </span>
                          <h3 className="truncate font-display text-lg font-semibold tracking-tight text-brand-text">
                            {barangay.name}
                          </h3>
                        </div>

                        <ArrowRight
                          size={18}
                          className="shrink-0 text-brand-primary/65 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-brand-primary"
                          aria-hidden="true"
                        />
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-white px-6 py-14 text-center sm:px-8">
              <h3 className="font-display text-lg font-semibold text-brand-text">
                No barangays found
              </h3>
              <p className="mt-2 text-sm text-brand-muted">
                Try another search term or clear the search field.
              </p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-4 inline-flex items-center rounded-lg border border-brand-primary px-4 py-2 text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
              >
                Clear search
              </button>
            </div>
          )}
        </div>

        <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-7 text-brand-muted">
            Looking for a barangay office or contact details? Continue to the
            complete directory.
          </p>

          <Link
            to="/about/barangays"
            className="group inline-flex w-fit items-center gap-2 border-b-2 border-brand-primary pb-1.5 text-sm font-semibold text-brand-primary transition-colors hover:opacity-80"
          >
            View all {totalBarangays} barangays
            <ArrowRight
              size={17}
              className="transition-transform duration-200 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}