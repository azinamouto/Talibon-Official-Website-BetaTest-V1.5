/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { lazy } from "react";
import { createBrowserRouter, createRoutesFromElements, RouterProvider, Outlet, Route, Navigate } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import ContentPage from "./pages/ContentPage";
import EServicesPage from "./pages/EServicesPage";
import AccessDenied from "./pages/AccessDenied";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";
import { aboutApi, executiveApi, legislativeApi, transparencyApi, tourismApi } from "./services/api";
import { StaffAuthProvider as AuthProvider } from "./contexts/StaffAuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";

// Modular Page/View Components

import BaseLayout from "./layouts/BaseLayout";
import { UIProvider } from "./contexts/UIContext";
import { AppConfigProvider } from "./contexts/AppConfigContext";
import ErrorPage from "./pages/ErrorPage";
import directoryStyles from "./pages/executive/DirectoryView.module.css";

// Secondary pages load on demand; homepage and access/error states stay eager.
const OfficialSealPage = lazy(() => import("./pages/OfficialSealPage"));
const EnactedOrdinancesPage = lazy(() => import("./pages/EnactedOrdinancesPage"));
const ResolutionsPage = lazy(() => import("./pages/ResolutionsPage"));
const CitizenCharterPage = lazy(() => import("./pages/CitizenCharterPage"));
const FullDisclosurePage = lazy(() => import("./pages/FullDisclosurePage"));
const OrganizationalChartPage = lazy(() => import("./pages/OrganizationalChartPage"));
const ServicesPage = lazy(() => import("./pages/ServicesPage"));
const PublicPageDetail = lazy(() => import("./pages/PublicPageDetail"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const NewsCategoryPage = lazy(() => import("./pages/NewsCategoryPage"));
const NewsDetailPage = lazy(() => import("./pages/NewsDetailPage"));
const DownloadsPage = lazy(() => import("./pages/DownloadsPage"));
const ServiceInfoPage = lazy(() => import("./pages/ServiceInfoPage"));
const Login = lazy(() => import("./pages/StaffLogin"));
const StaffPortal = lazy(() => import("./pages/StaffPortal"));
const TourismMapPage = lazy(() => import("./pages/TourismMapPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const ProfileView = lazy(() => import("./pages/about/ProfileView"));
const HistoryView = lazy(() => import("./pages/about/HistoryView"));
const MayorsView = lazy(() => import("./pages/about/MayorsView"));
const DepartmentsView = lazy(() => import("./pages/about/DepartmentsView"));
const BarangaysView = lazy(() => import("./pages/about/BarangaysView"));
const DemographicsView = lazy(() => import("./pages/about/DemographicsView"));
const LocationView = lazy(() => import("./pages/about/LocationView"));
const VicinityView = lazy(() => import("./pages/about/VicinityView"));
const IndustryView = lazy(() => import("./pages/about/IndustryView"));
const GovernmentServicesView = lazy(() => import("./pages/about/GovernmentServicesView"));
const HymnView = lazy(() => import("./pages/about/HymnView"));
const ExecutiveMandateView = lazy(() => import("./pages/executive/MandateView"));
const VisionMissionView = lazy(() => import("./pages/executive/VisionMissionView"));
const DirectoryView = lazy(() => import("./pages/executive/DirectoryView"));
const GadImsView = lazy(() => import("./pages/executive/GadImsView"));
const LegislativeMandateView = lazy(() => import("./pages/legislative/MandateView"));
const LegislativeStructureView = lazy(() => import("./pages/legislative/StructureView"));
const InfrastructureView = lazy(() => import("./pages/transparency/InfrastructureView"));
const FinanceView = lazy(() => import("./pages/transparency/FinanceView"));
const OrdersView = lazy(() => import("./pages/transparency/OrdersView"));
const BudgetView = lazy(() => import("./pages/transparency/BudgetView"));
const BiddingsView = lazy(() => import("./pages/transparency/BiddingsView"));
const SpotsView = lazy(() => import("./pages/tourism/SpotsView"));
const FestivitiesView = lazy(() => import("./pages/tourism/FestivitiesView"));
const DelicaciesView = lazy(() => import("./pages/tourism/DelicaciesView"));
const GadImsHeader = lazy(() => import("./components/GadImsSystem").then(module => ({ default: module.GadImsHeader })));

const router = createBrowserRouter(createRoutesFromElements(
  <Route element={<><ScrollToTop /><Outlet /></>}>
                  <Route element={<BaseLayout />}>
                    {/* Public routes remain available while auth initializes. */}
                    <Route>
                      <Route path="/" element={<Home />} />
                      <Route path="/login" element={<Login />} /><Route path="/staff/login" element={<Login />} />
                      <Route path="/e-services/*" element={<EServicesPage />} />
                      <Route path="/forms/*" element={<EServicesPage />} />
                      <Route path="/payment/*" element={<EServicesPage />} />
                      <Route path="/auth/callback" element={<Navigate to="/staff/login" replace />} />
          
                      <Route path="/downloads" element={<DownloadsPage />} />
                      <Route path="/services/:slug" element={<ServiceInfoPage />} />
                      <Route path="/tourism/map" element={<TourismMapPage />} />
                      <Route path="/news" element={<NewsCategoryPage />} />
                      <Route path="/services" element={<ServicesPage />} />
                      <Route path="/search" element={<SearchPage />} />
                      <Route path="/pages/:id" element={<PublicPageDetail />} />
                      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          
                      {/* About Talibon */}
                      <Route path="/about" element={<Navigate to="/about/profile" replace />} />
                      <Route path="/about/mayor" element={<Navigate to="/about/mayors" replace />} />
                      <Route path="/about/profile" element={<ContentPage standardLayout title="Brief Profile" fetchData={aboutApi.getProfile} renderContent={(data) => <ProfileView data={data} />} />} />
                      <Route path="/about/seal" element={<OfficialSealPage />} />
                      <Route path="/about/history" element={<ContentPage standardLayout title="Brief History" fetchData={aboutApi.getHistory} renderContent={(data) => <HistoryView data={data} />} />} />
                      <Route path="/about/mayors" element={<ContentPage standardLayout title="List of Mayors" fetchData={aboutApi.getMayors} renderContent={(data) => <MayorsView data={data} />} />} />
                      <Route path="/about/departments" element={<ContentPage standardLayout title="Departments" fetchData={aboutApi.getDepartments} renderContent={(data) => <DepartmentsView data={data} />} />} />
                      <Route path="/about/barangays" element={<ContentPage standardLayout pageHeader={<></>} title="Barangay Profiles" fetchData={aboutApi.getBarangays} renderContent={(data) => <BarangaysView data={data} />} />} />
                      <Route path="/about/demographics" element={<ContentPage standardLayout title="Demographics" fetchData={aboutApi.getDemographics} renderContent={(data) => <DemographicsView data={data} />} />} />
                      <Route path="/about/location" element={<ContentPage standardLayout title="Location" fetchData={aboutApi.getLocation} renderContent={(data) => <LocationView data={data} />} />} />
                      <Route path="/about/vicinity" element={<ContentPage standardLayout title="Vicinity Map" fetchData={aboutApi.getVicinityMap} renderContent={(data) => <VicinityView data={data} />} />} />
                      <Route path="/about/industry" element={<ContentPage standardLayout title="Industry" fetchData={aboutApi.getIndustry} renderContent={(data) => <IndustryView data={data} />} />} />
                      <Route path="/about/services" element={<ContentPage standardLayout title="Government Services" fetchData={aboutApi.getServices} renderContent={(data) => <GovernmentServicesView data={data} />} />} />
                      <Route path="/about/hymn" element={<ContentPage standardLayout title="Talibon Hymn" fetchData={aboutApi.getHymn} renderContent={(data) => <HymnView data={data} />} />} />

                      {/* Executive */}
                      <Route path="/executive/mandate" element={<ContentPage title="Executive Mandate" fetchData={executiveApi.getMandate} renderContent={(data) => <ExecutiveMandateView data={data} />} />} />
                      <Route path="/executive/vision-mission" element={<ContentPage title="Vision & Mission" fetchData={executiveApi.getVisionMission} renderContent={(data) => <VisionMissionView data={data} />} />} />
                      <Route path="/executive/chart" element={<OrganizationalChartPage />} />
                      <Route path="/executive/directory" element={<div className={directoryStyles.page}><ContentPage standardLayout title="Directory of departments" fetchData={executiveApi.getDirectory} renderContent={(data) => <DirectoryView data={data} />} /></div>} />
                      <Route path="/executive/gad-ims" element={<ContentPage standardLayout pageHeader={<GadImsHeader />} title="Talibon GAD-IMS" fetchData={executiveApi.getGadIms} renderContent={(data) => <GadImsView data={data} />} />} />

                      {/* Legislative */}
                      <Route path="/legislative/mandate" element={<ContentPage title="Legislative Mandate" fetchData={legislativeApi.getMandate} renderContent={(data) => <LegislativeMandateView data={data} />} />} />
                      <Route path="/legislative/structure" element={<ContentPage title="Organizational Structure" fetchData={legislativeApi.getStructure} renderContent={(data) => <LegislativeStructureView data={data} />} />} />
                      <Route path="/legislative/ordinances" element={<EnactedOrdinancesPage />} />
                      <Route path="/legislative/resolutions" element={<ResolutionsPage />} />

                      {/* News */}
                      <Route path="/news/view/:id" element={<NewsDetailPage />} />
                      <Route path="/news/:category" element={<NewsCategoryPage />} />

                      {/* Transparency */}
                      <Route path="/transparency/charter" element={<CitizenCharterPage />} />
                      <Route path="/transparency/disclosure" element={<FullDisclosurePage />} />
                      <Route path="/transparency/infrastructure" element={<ContentPage spacingLayout title="Infrastructure Projects" fetchData={transparencyApi.getInfrastructure} renderContent={(data) => <InfrastructureView data={data} />} />} />
                      <Route path="/transparency/finance" element={<ContentPage spacingLayout title="Finance Reports" fetchData={transparencyApi.getFinanceReports} renderContent={(data) => <FinanceView data={data} />} />} />
                      <Route path="/transparency/orders" element={<ContentPage spacingLayout title="Executive Orders" fetchData={transparencyApi.getExecutiveOrders} renderContent={(data) => <OrdersView data={data} />} />} />
                      <Route path="/transparency/budget" element={<ContentPage spacingLayout title="Budget and Finances" fetchData={transparencyApi.getBudget} renderContent={(data) => <BudgetView data={data} />} />} />
                      <Route path="/transparency/biddings" element={<ContentPage spacingLayout title="Biddings" fetchData={transparencyApi.getBiddings} renderContent={(data) => <BiddingsView data={data} />} />} />

                      {/* Tourism */}
                      <Route path="/tourism/spots" element={<ContentPage spacingLayout title="Tourist Spots" fetchData={tourismApi.getSpots} renderContent={(data) => <SpotsView data={data} />} />} />
                      <Route path="/tourism/festivities" element={<ContentPage spacingLayout title="Festivities" fetchData={tourismApi.getFestivities} renderContent={(data) => <FestivitiesView data={data} />} />} />
                      <Route path="/tourism/delicacies" element={<ContentPage spacingLayout title="Local Delicacies" fetchData={tourismApi.getDelicacies} renderContent={(data) => <DelicaciesView data={data} />} />} />

                      {/* Forms */}

                      {/* Access Control & Fallback Routes */}
                      <Route path="/access-denied" element={<AccessDenied />} />
                      <Route path="*" element={<NotFound />} />
                    </Route>
                    <Route>
                      <Route path="/admin" element={<StaffPortal />} />
                      <Route path="/dashboard" element={<StaffPortal />} />
                      <Route path="/cms" element={<StaffPortal />} />
                      <Route path="/manage/*" element={<StaffPortal />} />
                    </Route>
                  </Route>

  </Route>
));

export default function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />} componentName="Application">
      <AppConfigProvider>
        <UIProvider>
          <LanguageProvider>
            <AuthProvider>
              <RouterProvider router={router} />
            </AuthProvider>
          </LanguageProvider>
        </UIProvider>
      </AppConfigProvider>
    </ErrorBoundary>
  );
}
