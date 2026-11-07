export interface AboutNavigationLink { name: string; href: string; section?: string }

// The existing navbar fallback, shared verbatim with the Brief Profile sidebar.
export const ABOUT_NAV_LINKS: AboutNavigationLink[] = [
        { name: "Brief Profile", href: "/about/profile" },
        { name: "Official Seal", href: "/about/seal" },
        { name: "Brief History", href: "/about/history" },
        { name: "List of Mayors", href: "/about/mayors" },
        { name: "Vicinity Map", href: "/about/vicinity" },
        { name: "Demographics", href: "/about/demographics" },
        { name: "Location", href: "/about/location" },
        { name: "Industry", href: "/about/industry" },
        { name: "Government Services", href: "/services" },
        { name: "Talibon Hymn", href: "/about/hymn" },
      ];

export function resolveAboutNavigation(rows: AboutNavigationLink[]) {
  const links = rows.filter(link => link.section === 'ABOUT');
  return links.length ? links : ABOUT_NAV_LINKS;
}
