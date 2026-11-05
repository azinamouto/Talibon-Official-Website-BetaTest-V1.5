
import React from "react";
import { motion } from "motion/react";
import { ShieldCheck, Lock, Database, Globe, Eye, Server, Mail, Phone, MapPin, ExternalLink, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import styles from "./PrivacyPolicyPage.module.css";

export default function PrivacyPolicyPage() {
  return (
    <div className={`${styles.section} min-h-screen bg-brand-surface py-12 px-4 sm:px-6 lg:px-8`}>
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white border border-brand-border rounded-2xl p-6 sm:p-10 shadow-xs">
          <div className="flex items-center gap-3 text-brand-text mb-3">
            <ShieldCheck size={28} className="text-brand-primary" />
            <span className="text-xs font-black uppercase tracking-widest">Republic of the Philippines • RA 10173</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-display tracking-tight">
            Privacy Notice & Data Processing Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2">
            Local Government Unit of Talibon, Bohol • Draft notice — municipal DPO review and approval required
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5 font-bold">
              <CheckCircle size={14} className="text-emerald-600" /> No Third-Party Tracking Pixels
            </span>
            <span className="flex items-center gap-1.5 font-bold">
              <CheckCircle size={14} className="text-emerald-600" /> No Advertising Cookies
            </span>
            <span className="flex items-center gap-1.5 font-bold">
              <CheckCircle size={14} className="text-emerald-600" /> Privacy Controls Under Review
            </span>
          </div>
        </div>

        {/* Section 1: Statutory Mandate & Purpose */}
        <section className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--privacy-sky)] text-brand-text flex items-center justify-center font-bold text-xs">
              01
            </div>
            <h2 className="text-lg font-bold text-slate-900 font-display">Statutory Mandate & Commitment</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
            The Local Government Unit (LGU) of Talibon, Bohol is committed to protecting citizen privacy in compliance with Republic Act No. 10173, otherwise known as the <strong>Data Privacy Act of 2012 (DPA)</strong>, its Implementing Rules and Regulations (IRR), and issuances by the National Privacy Commission (NPC).
          </p>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
            This website provides public municipal information and staff administration tools. Citizen e-services, application submissions, and online payments are not currently available.
          </p>
        </section>

        {/* Section 2: Browser Storage & Cookies */}
        <section className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--privacy-sky)] text-brand-text flex items-center justify-center font-bold text-xs">
              02
            </div>
            <h2 className="text-lg font-bold text-slate-900 font-display">Browser Storage & Cookie Inventory</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
            The application uses local storage for the selected language. Staff authentication is managed by the same-origin API; credentials are not stored in local storage by the frontend.
          </p>

          {/* Storage Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Storage Key</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Purpose</th>
                  <th className="p-3">Lifespan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                <tr>
                  <td className="p-3 font-bold text-slate-900">language</td>
                  <td className="p-3 font-sans">localStorage</td>
                  <td className="p-3 font-sans"><span className="px-2 py-0.5 bg-[var(--privacy-sky-light)] text-brand-text rounded font-bold">Functional</span></td>
                  <td className="p-3 font-sans text-xs">Remembers your preferred language selection (English or Cebuano).</td>
                  <td className="p-3 font-sans">Persistent</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-900">Staff session</td>
                  <td className="p-3 font-sans">Server-managed cookie</td>
                  <td className="p-3 font-sans"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded font-bold">Strictly Necessary</span></td>
                  <td className="p-3 font-sans text-xs">Maintains the authenticated staff session through same-origin API requests.</td>
                  <td className="p-3 font-sans">Managed by the API</td>
                </tr>
              </tbody>
            </table>
          </div>

        </section>

        {/* Section 3: Third-Party Integrations & Privacy Facades */}
        <section className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--privacy-sky)] text-brand-text flex items-center justify-center font-bold text-xs">
              03
            </div>
            <h2 className="text-lg font-bold text-slate-900 font-display">Third-Party Content & Privacy Facades</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
            To prevent unsolicited third-party data tracking, Digital Talibon Core implements <strong>Two-Click Privacy Facades</strong> on external media and maps.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Meta / Facebook Page Plugin</span>
                <span className="text-[10px] font-mono font-bold text-brand-primary uppercase">Blocked by Default</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Official social media feeds from the Talibon Public Information Office (PIO) are embedded using an explicit activation facade. No requests or cookies are sent to Meta until you click <em>"Load Facebook Feed"</em>.
              </p>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Google Maps Embed</span>
                <span className="text-[10px] font-mono font-bold text-brand-primary uppercase">Explicit Activation</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Interactive geographic maps of Talibon are protected behind an interactive facade. Your IP address is not sent to Google until you activate the map or open the direct map link.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Citizen Data Rights */}
        <section className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--privacy-sky)] text-brand-text flex items-center justify-center font-bold text-xs">
              04
            </div>
            <h2 className="text-lg font-bold text-slate-900 font-display">Your Rights Under RA 10173</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
            As a data subject under Philippine law, you have the following rights regarding the personal information you submit for municipal applications:
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 pt-2 font-medium">
            <li className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <strong>Right to be Informed:</strong> Transparent disclosure of how and why your information is collected.
            </li>
            <li className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <strong>Right to Access:</strong> You may verify the status and data of your municipal filings via Ticket ID.
            </li>
            <li className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <strong>Right to Rectification:</strong> You may request correction of erroneous or outdated application data.
            </li>
            <li className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <strong>Right to File Complaints:</strong> You may seek redress before the National Privacy Commission (NPC).
            </li>
          </ul>
        </section>

        {/* Section 5: Data Protection Officer Contact */}
        <section className="bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--privacy-sky)] text-brand-text flex items-center justify-center font-bold text-xs">
              05
            </div>
            <h2 className="text-lg font-bold text-slate-900 font-display">Data Protection Officer (DPO) Contact</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
            For inquiries, data access requests, or privacy concerns regarding local government processing, please contact the municipal data privacy office:
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6 space-y-3 text-xs text-slate-800 font-medium">
            <div className="flex items-center gap-3">
              <MapPin size={16} className="text-brand-primary shrink-0" />
              <span>Office of the Data Protection Officer, Municipal Hall, Poblacion, Talibon, Bohol 6325</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-brand-primary shrink-0" />
              <span>privacy@talibon.gov.ph / talibonofficial@gmail.com</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-brand-primary shrink-0" />
              <span>(038) 422-2895 / Trunkline Local 104</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
