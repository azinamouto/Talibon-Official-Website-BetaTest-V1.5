import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { ContentData } from "../types";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../constants";
import { isMockAllowed } from "../lib/mode";

// Simple cache implementation
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

const getCacheKey = (table: string, slug: string) => `${table}:${slug}`;

const isCacheValid = (timestamp: number): boolean => {
  return Date.now() - timestamp < CACHE_DURATION;
};

const api = {
  get: async (table: string, slug: string): Promise<ContentData> => {
    const cacheKey = getCacheKey(table, slug);
    const cached = cache.get(cacheKey);

    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data;
    }

    let result: any = null;
    let fetchedSuccessfully = false;

    if (isSupabaseConfigured && table !== "content") {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq("slug", slug)
          .limit(1);

        if (!error && data && data.length > 0) {
          const singleData = data[0];
          result = singleData?.body || singleData;
          fetchedSuccessfully = true;
        } else if (error) {
          console.warn(`Supabase query failed for ${table}/${slug}:`, error.message);
        }
      } catch (error) {
        console.warn(`Supabase API error: ${error}`);
      }
    }

    // Fallback/direct fetch from local NestJS API
    if (!fetchedSuccessfully) {
      try {
        const firstDash = slug.indexOf("-");
        if (firstDash !== -1) {
          const prefix = slug.substring(0, firstDash);
          const suffix = slug.substring(firstDash + 1);
          const response = await fetch(`/api/${prefix}/${suffix}`);
          if (response.ok) {
            const json = await response.json();
            // Wrap in `{ data: json }` for forms endpoints if they return raw arrays
            if (prefix === "forms" && Array.isArray(json)) {
              result = { data: json };
            } else {
              result = json;
            }
            fetchedSuccessfully = true;
          } else {
            console.warn(`Local API fetch failed for /api/${prefix}/${suffix} (Status: ${response.status})`);
          }
        }
      } catch (err) {
        console.warn(`Local API fetch error for slug ${slug}:`, err);
      }
    }

    // Final emergency fallbacks if both Supabase and Local API are unavailable
    if (!fetchedSuccessfully) {
      if (!isMockAllowed()) {
        throw new Error(`[API] Resource unconfigured or database offline: ${table}/${slug}`);
      }
      if (slug === "forms-business-permits") {
        result = {
          data: [
            { id: 1, title: "Business Permit Application Form", url: "http://talibon.gov.ph/wp-content/uploads/2025/10/BUSINESS-PERMIT-APPLICATION-FORM.pdf" },
            { id: 2, title: "Business Permit Renewal Form", url: "#" }
          ]
        };
      } else if (slug === "forms-building-permits") {
        result = {
          data: [
            { id: 1, title: "Unified Application Form for Building Permit", url: "http://talibon.gov.ph/wp-content/uploads/2025/10/UNIFIED-APPLICATION-FORM-FOR-BUILDING-PERMIT.pdf" },
            { id: 2, title: "Application for Electrical Permit", url: "http://talibon.gov.ph/wp-content/uploads/2025/10/APPLICATION-FOR-ELECTRICAL-PERMIT.pdf" },
            { id: 3, title: "Architectural Permit", url: "http://talibon.gov.ph/wp-content/uploads/2025/10/ARCHITECTURAL-PERMIT.pdf" },
            { id: 4, title: "Civil/Structural Permit", url: "http://talibon.gov.ph/wp-content/uploads/2025/10/CIVIL_STRUCTURAL-PERMIT.pdf" },
            { id: 5, title: "Plumbing Permit", url: "http://talibon.gov.ph/wp-content/uploads/2025/10/PLUMBING-PERMIT.pdf" }
          ]
        };
      } else if (slug === "forms-zoning-clearance") {
        result = {
          data: [
            { id: 1, title: "Locational Clearance Application Form", url: "http://talibon.gov.ph/wp-content/uploads/2025/10/LC-Application-Form.pdf" }
          ]
        };
      } else {
        result = { data: [], content: "" };
      }
    }

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  },
};

export { aboutApi } from "./aboutApi";

export const executiveApi = {
  getMandate: () => api.get("content", API_ENDPOINTS.EXECUTIVE.MANDATE).then(data => {
    if (!data.content) {
      return {
        content: "The Executive Department of Talibon is mandated to implement all programs, projects, services, and activities of the municipality in accordance with the Local Government Code of 1991. Led by the Municipal Mayor, the office ensures the delivery of basic services, the maintenance of public order, and the promotion of the general welfare of all Talibonanos."
      };
    }
    return data;
  }),
  getVisionMission: () => api.get("content", API_ENDPOINTS.EXECUTIVE.VISION_MISSION).then(data => {
    if (!data.vision) {
      return {
        vision: "A premier eco-cultural tourism destination and an agro-industrial hub in Northern Bohol, with a God-centered, empowered, and resilient citizenry living in a sustainable environment under a transparent and dynamic leadership.",
        mission: "To provide quality basic services, promote sustainable development, and foster inclusive growth through participatory governance while preserving our rich cultural heritage and natural resources."
      };
    }
    return data;
  }),
  getChart: () => api.get("content", API_ENDPOINTS.EXECUTIVE.CHART),
  getDirectory: () => api.get("content", API_ENDPOINTS.EXECUTIVE.DIRECTORY),
  getGadIms: () => api.get("content", API_ENDPOINTS.EXECUTIVE.GAD_IMS).then(data => {
    if (!data.sections) {
      return {
        title: "Talibon GAD Analytics App",
        subtitle: "Sex-Disaggregated Data Management, Monitoring, and Reporting System",
        sections: [
          {
            id: "overview",
            title: "01. Background & Rationale",
            content: [
              {
                subTitle: "Problem Statement",
                items: [
                  "Current data collection is fragmented and manual.",
                  "Lack of consistent sex-disaggregated data.",
                  "Fragmented monitoring of program effectiveness."
                ]
              },
              {
                subTitle: "Policy Compliance",
                items: [
                  "RA 9710 (Magna Carta of Women)",
                  "Joint Circular 2012-01 (PCW-DILG-DBM-NEDA)",
                  "Data Privacy Act of 2012 (RA 10173)"
                ]
              }
            ]
          },
          {
            id: "data-modules",
            title: "02. Core System Modules",
            content: [
              {
                subTitle: "User Management Module",
                items: [
                  "Role-based access control (RBAC)",
                  "Secure login & authentication",
                  "Defined roles: Super Admin, GAD Focal, MPDC, Encoders"
                ]
              },
              {
                subTitle: "Beneficiary Profiling Module",
                items: [
                  "Encoding of unique individual records (Name, Sex, Age, Barangay)",
                  "Automated ID generation",
                  "Editable and searchable demographic database"
                ]
              },
              {
                subTitle: "Program/Service Monitoring",
                items: [
                  "Recording of services availed",
                  "Linking beneficiaries to specific programs",
                  "Categorization by sector and gender"
                ]
              }
            ]
          },
          {
            id: "analysis",
            title: "03. Analytics & Dashboard",
            content: [
              {
                subTitle: "Real-time Visualization",
                items: [
                  "Male vs Female distribution charts",
                  "Age group breakdown and Sectoral analysis",
                  "Barangay-level statistics",
                  "Trend analysis (monthly/annual)"
                ]
              },
              {
                subTitle: "Automated Reporting",
                items: [
                  "GPB and GAR support tables",
                  "Custom report filters",
                  "Export to Excel and PDF"
                ]
              }
            ]
          },
          {
            id: "admin",
            title: "04. Governance & Strategy",
            content: [
              {
                subTitle: "Implementation Strategy",
                items: [
                  "Phase 1: Planning and Design requirements gathering",
                  "Phase 2: System coding and initial deployment",
                  "Phase 3: Capacity Building (Staff training)",
                  "Phase 4: Pilot implementation in selected offices",
                  "Phase 5: Municipality-wide full rollout"
                ]
              },
              {
                subTitle: "Security Measures",
                items: [
                  "Encrypted data storage and regular backups",
                  "Audit trail tracking user activity",
                  "Consent-based data collection compliance"
                ]
              }
            ]
          }
        ]
      };
    }
    return data;
  }),
};

export const legislativeApi = {
  getMandate: () => api.get("content", API_ENDPOINTS.LEGISLATIVE.MANDATE),
  getStructure: () => api.get("content", API_ENDPOINTS.LEGISLATIVE.STRUCTURE),
};

export const transparencyApi = {
  getCitizenCharter: () => api.get("content", API_ENDPOINTS.TRANSPARENCY.CITIZEN_CHARTER),
  getFullDisclosure: () => api.get("content", API_ENDPOINTS.TRANSPARENCY.FULL_DISCLOSURE),
  getInfrastructure: () => api.get("content", API_ENDPOINTS.TRANSPARENCY.INFRASTRUCTURE),
  getFinanceReports: async () => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("transparency_documents")
          .select("*")
          .or("category.eq.reports,category.eq.finance,category.eq.disclosure,category.eq.budget")
          .eq("status", "published")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((doc: any) => ({
            id: doc.id,
            title: doc.title,
            url: doc.file_url || "#"
          }));
        }
      } catch (err) {
        console.warn("[transparencyApi] Live finance fetch failed, falling back:", err);
      }
    }
    return api.get("content", API_ENDPOINTS.TRANSPARENCY.FINANCE_REPORTS);
  },
  getExecutiveOrders: () => api.get("content", API_ENDPOINTS.TRANSPARENCY.EXECUTIVE_ORDERS),
  getBudget: async () => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("transparency_documents")
          .select("*")
          .eq("category", "budget")
          .eq("status", "published")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          return {
            title: "Budget and Finances",
            annualBudget: "OFFICIAL DOCUMENTS AVAILABLE",
            status: "PUBLISHED",
            documents: data,
            breakdown: [],
          };
        }
      } catch (err) {
        console.warn("[transparencyApi] Live budget fetch fallback:", err);
      }
    }
    return {
      title: "Budget and Finances",
      annualBudget: "TO BE POSTED",
      status: "TO BE POSTED",
      breakdown: [],
      message: "The approved annual budget, appropriation ordinances, and financial allocation summaries are currently being prepared for posting by the Municipal Budget Office in compliance with the DILG Full Disclosure Policy."
    };
  },
  getBiddings: () => api.get("content", API_ENDPOINTS.TRANSPARENCY.BIDDINGS),
};

export const tourismApi = {
  getSpots: async () => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("tourism_spots")
          .select("*")
          .order("name", { ascending: true });
        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn("Failed to fetch live tourism spots, falling back:", err);
      }
    }
    return api.get("content", API_ENDPOINTS.TOURISM.SPOTS);
  },
  getFestivities: async () => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .order("date", { ascending: true });
        if (!error && data && data.length > 0) {
          return data.map((evt: any) => ({
            name: evt.title,
            date: evt.date,
            description: evt.description,
            banner_image: evt.banner_image,
            venue: evt.venue,
            time: evt.time
          }));
        }
      } catch (err) {
        console.warn("Failed to fetch live events for festivities, falling back:", err);
      }
    }
    return api.get("content", API_ENDPOINTS.TOURISM.FESTIVITIES);
  },
  getDelicacies: async () => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("tourism_spots")
          .select("*")
          .order("name", { ascending: true });
        if (!error && data && data.length > 0) {
          const delicacies = data.filter((s: any) => 
            (s.description && (s.description.toLowerCase().includes("delicacy") || s.description.toLowerCase().includes("food") || s.description.toLowerCase().includes("calamay") || s.description.toLowerCase().includes("crab") || s.description.toLowerCase().includes("seafood"))) ||
            (s.name && (s.name.toLowerCase().includes("delicacy") || s.name.toLowerCase().includes("calamay") || s.name.toLowerCase().includes("crab") || s.name.toLowerCase().includes("food")))
          );
          if (delicacies.length > 0) {
            return delicacies.map((d: any) => ({
              name: d.name,
              description: d.description,
              featured_image: d.featured_image
            }));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch live delicacies, falling back:", err);
      }
    }
    return api.get("content", API_ENDPOINTS.TOURISM.DELICACIES);
  },
};

export const formsApi = {
  getBusinessPermits: () => api.get("content", API_ENDPOINTS.FORMS.BUSINESS_PERMITS),
  getBuildingPermits: () => api.get("content", API_ENDPOINTS.FORMS.BUILDING_PERMITS),
  getZoningClearance: () => api.get("content", API_ENDPOINTS.FORMS.ZONING_CLEARANCE),
};

export default api;
