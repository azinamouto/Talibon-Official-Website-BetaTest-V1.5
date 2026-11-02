import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LayoutGrid, MapPin, Rows3, Search } from "lucide-react";
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
      className="scroll-mt-40 border-t border-brand-border bg-brand-bg py-10 sm:py-12 lg:py-16"
    >
      <div className="site-container">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-primary">
              Community directory
            </p>
            <h2
              id="barangays-heading"
              className="font-display text-2xl font-bold tracking-tight text-brand-text sm:text-3xl"
            >
              Barangays of Talibon
            </h2>
            <p className="mt-3 text-sm leading-6 text-brand-muted sm:text-base">
              Find a barangay by name. Open the full directory for office and contact details.
            </p>
          </div>
          <Link
            to="/about/barangays"
            className="inline-flex min-h-11 w-fit shrink-0 items-center justify-center gap-2 rounded-lg border border-brand-border bg-white px-4 py-2.5 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary hover:text-brand-primary active:bg-brand-primary/5"
          >
            View full directory
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-6 flex flex-col gap-4 border-y border-brand-border py-4 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="relative block w-full sm:max-w-sm sm:flex-1">
            <span className="sr-only">Search for a barangay</span>
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search barangays"
              className="h-11 w-full rounded-lg border border-brand-border bg-white pl-10 pr-3 text-sm text-brand-text placeholder:text-brand-muted"
            />
          </label>
          <div className="flex items-center justify-between gap-4 sm:ml-auto sm:justify-end">
            <p role="status" className="text-sm text-brand-muted">
              {isSearching
                ? visibleBarangays.length + (visibleBarangays.length === 1 ? " match" : " matches")
                : "Showing " + visibleBarangays.length + " of " + totalBarangays}
            </p>
            <div
              className="inline-flex shrink-0 items-center rounded-lg border border-brand-border bg-white p-1"
              role="group"
              aria-label="Barangay list view options"
            >
              {([
                { mode: "grid", label: "Grid", icon: LayoutGrid },
                { mode: "list", label: "List", icon: Rows3 },
              ] as const).map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  aria-pressed={viewMode === mode}
                  className={[
                    "inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
                    viewMode === mode
                      ? "bg-brand-primary/10 text-brand-text"
                      : "text-brand-muted hover:bg-brand-bg hover:text-brand-text",
                  ].join(" ")}
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {visibleBarangays.length > 0 ? (
          <ul
            className={[
              "mt-5 grid gap-3",
              viewMode === "grid"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                : "grid-cols-1",
            ].join(" ")}
          >
            {visibleBarangays.map((barangay) => (
              <li key={barangay.id} className="min-w-0">
                <Link
                  to="/about/barangays"
                  aria-label={"Open barangay directory including " + barangay.name}
                  className={[
                    "group flex h-full items-center gap-3 rounded-xl border border-brand-border bg-white px-4 transition-colors hover:border-brand-primary/60 hover:bg-brand-primary/[0.03] focus-visible:border-brand-primary",
                    viewMode === "grid" ? "py-4" : "py-3",
                  ].join(" ")}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-bg text-brand-primary"
                    aria-hidden="true"
                  >
                    <MapPin size={18} />
                  </span>
                  <h3 className="min-w-0 flex-1 break-words text-base font-semibold leading-6 text-brand-text group-hover:text-brand-primary">
                    {barangay.name}
                  </h3>
                  <ArrowRight
                    size={16}
                    className="shrink-0 text-brand-muted transition-colors group-hover:text-brand-primary"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-5 rounded-xl border border-brand-border bg-white px-5 py-10 text-center">
            <Search size={24} className="mx-auto mb-3 text-brand-muted" aria-hidden="true" />
            <h3 className="text-base font-semibold text-brand-text">
              No barangays found
            </h3>
            <p className="mt-2 text-sm leading-6 text-brand-muted">
              Try another name or clear your search to see the preview.
            </p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-brand-border px-4 py-2 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary hover:text-brand-primary"
            >
              Clear search
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
