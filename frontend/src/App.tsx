/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import ContentPage from "./pages/ContentPage";
import OfficialSealPage from "./pages/OfficialSealPage";
import EnactedOrdinancesPage from "./pages/EnactedOrdinancesPage";
import ResolutionsPage from "./pages/ResolutionsPage";
import CitizenCharterPage from "./pages/CitizenCharterPage";
import FullDisclosurePage from "./pages/FullDisclosurePage";
import BusinessPermitPage from "./pages/BusinessPermitPage";
import BuildingPermitPage from "./pages/BuildingPermitPage";
import ZoningClearancePage from "./pages/ZoningClearancePage";
import OrganizationalChartPage from "./pages/OrganizationalChartPage";
import UpdatesPage from "./pages/UpdatesPage";
import NewsCategoryPage from "./pages/NewsCategoryPage";
import NewsDetailPage from "./pages/NewsDetailPage";
import DownloadsPage from "./pages/DownloadsPage";
import ServiceInfoPage from "./pages/ServiceInfoPage";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import EServicesPage from "./pages/EServicesPage";
import AdminDashboard from "./pages/AdminDashboard";
import AccessDenied from "./pages/AccessDenied";
import NotFound from "./pages/NotFound";
import TourismMapPage from "./pages/TourismMapPage";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import ScrollToTop from "./components/ScrollToTop";
import { aboutApi, executiveApi, legislativeApi, transparencyApi, tourismApi, formsApi } from "./services/api";
import { AuthProvider } from "./contexts/SupabaseAuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";

// Modular Page/View Components
import ProfileView from "./pages/about/ProfileView";
import HistoryView from "./pages/about/HistoryView";
import MayorsView from "./pages/about/MayorsView";
import DepartmentsView from "./pages/about/DepartmentsView";
import BarangaysView from "./pages/about/BarangaysView";
import DemographicsView from "./pages/about/DemographicsView";
import LocationView from "./pages/about/LocationView";
import VicinityView from "./pages/about/VicinityView";
import IndustryView from "./pages/about/IndustryView";
import GovernmentServicesView from "./pages/about/GovernmentServicesView";
import HymnView from "./pages/about/HymnView";

import ExecutiveMandateView from "./pages/executive/MandateView";
import VisionMissionView from "./pages/executive/VisionMissionView";
import DirectoryView from "./pages/executive/DirectoryView";
import GadImsView from "./pages/executive/GadImsView";

import LegislativeMandateView from "./pages/legislative/MandateView";
import LegislativeStructureView from "./pages/legislative/StructureView";

import InfrastructureView from "./pages/transparency/InfrastructureView";
import FinanceView from "./pages/transparency/FinanceView";
import OrdersView from "./pages/transparency/OrdersView";
import BudgetView from "./pages/transparency/BudgetView";
import BiddingsView from "./pages/transparency/BiddingsView";

import SpotsView from "./pages/tourism/SpotsView";
import FestivitiesView from "./pages/tourism/FestivitiesView";
import DelicaciesView from "./pages/tourism/DelicaciesView";


import BaseLayout from "./layouts/BaseLayout";
import { ProtectedRoute, STAFF_ROLES } from "./routes/RouteGuards";
import { UIProvider } from "./contexts/UIContext";
import { AppConfigProvider } from "./contexts/AppConfigContext";
import ErrorPage from "./pages/ErrorPage";

export default function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />} componentName="Application">
      <AppConfigProvider>
        <UIProvider>
          <LanguageProvider>
            <AuthProvider>
              <Router>
                <ScrollToTop />
                <Routes>
                  <Route element={<BaseLayout />}>
                    {/* Public routes remain available while auth initializes. */}
                    <Route>
                      <Route path="/" element={<Home />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/e-services" element={<EServicesPage />} />
                      <Route path="/auth/callback" element={<AuthCallback />} />
          
                      <Route path="/downloads" element={<DownloadsPage />} />
                      <Route path="/services/:slug" element={<ServiceInfoPage />} />
                      <Route path="/payment/success" element={<PaymentSuccess />} />
                      <Route path="/payment/cancel" element={<PaymentCancel />} />
                      <Route path="/tourism/map" element={<TourismMapPage />} />
                      <Route path="/news/updates" element={<UpdatesPage />} />
                      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          
                      {/* About Talibon */}
                      <Route path="/about" element={<Navigate to="/about/profile" replace />} />
                      <Route path="/about/mayor" element={<Navigate to="/about/mayors" replace />} />
                      <Route path="/about/profile" element={<ContentPage title="Brief Profile" fetchData={aboutApi.getProfile} renderContent={(data) => <ProfileView data={data} />} />} />
                      <Route path="/about/seal" element={<OfficialSealPage />} />
                      <Route path="/about/history" element={<ContentPage title="Brief History" fetchData={aboutApi.getHistory} renderContent={(data) => <HistoryView data={data} />} />} />
                      <Route path="/about/mayors" element={<ContentPage title="List of Mayors" fetchData={aboutApi.getMayors} renderContent={(data) => <MayorsView data={data} />} />} />
                      <Route path="/about/departments" element={<ContentPage title="Departments" fetchData={aboutApi.getDepartments} renderContent={(data) => <DepartmentsView data={data} />} />} />
                      <Route path="/about/barangays" element={<ContentPage title="Barangay Profiles" fetchData={aboutApi.getBarangays} renderContent={(data) => <BarangaysView data={data} />} />} />
                      <Route path="/about/demographics" element={<ContentPage title="Demographics" fetchData={aboutApi.getDemographics} renderContent={(data) => <DemographicsView data={data} />} />} />
                      <Route path="/about/location" element={<ContentPage title="Location" fetchData={aboutApi.getLocation} renderContent={(data) => <LocationView data={data} />} />} />
                      <Route path="/about/vicinity" element={<ContentPage title="Vicinity Map" fetchData={aboutApi.getVicinityMap} renderContent={(data) => <VicinityView data={data} />} />} />
                      <Route path="/about/industry" element={<ContentPage title="Industry" fetchData={aboutApi.getIndustry} renderContent={(data) => <IndustryView data={data} />} />} />
                      <Route path="/about/services" element={<ContentPage title="Government Services" fetchData={aboutApi.getServices} renderContent={(data) => <GovernmentServicesView data={data} />} />} />
                      <Route path="/about/hymn" element={<ContentPage title="Talibon Hymn" fetchData={aboutApi.getHymn} renderContent={(data) => <HymnView data={data} />} />} />

                      {/* Executive */}
                      <Route path="/executive/mandate" element={<ContentPage title="Executive Mandate" fetchData={executiveApi.getMandate} renderContent={(data) => <ExecutiveMandateView data={data} />} />} />
                      <Route path="/executive/vision-mission" element={<ContentPage title="Vision & Mission" fetchData={executiveApi.getVisionMission} renderContent={(data) => <VisionMissionView data={data} />} />} />
                      <Route path="/executive/chart" element={<OrganizationalChartPage />} />
                      <Route path="/executive/directory" element={<ContentPage title="Directory of Departments" fetchData={executiveApi.getDirectory} renderContent={(data) => <DirectoryView data={data} />} />} />
                      <Route path="/executive/gad-ims" element={<ContentPage title="Talibon GAD-IMS" fetchData={executiveApi.getGadIms} renderContent={(data) => <GadImsView data={data} />} />} />

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
                      <Route path="/transparency/infrastructure" element={<ContentPage title="Infrastructure Projects" fetchData={transparencyApi.getInfrastructure} renderContent={(data) => <InfrastructureView data={data} />} />} />
                      <Route path="/transparency/finance" element={<ContentPage title="Finance Reports" fetchData={transparencyApi.getFinanceReports} renderContent={(data) => <FinanceView data={data} />} />} />
                      <Route path="/transparency/orders" element={<ContentPage title="Executive Orders" fetchData={transparencyApi.getExecutiveOrders} renderContent={(data) => <OrdersView data={data} />} />} />
                      <Route path="/transparency/budget" element={<ContentPage title="Budget and Finances" fetchData={transparencyApi.getBudget} renderContent={(data) => <BudgetView data={data} />} />} />
                      <Route path="/transparency/biddings" element={<ContentPage title="Biddings" fetchData={transparencyApi.getBiddings} renderContent={(data) => <BiddingsView data={data} />} />} />

                      {/* Tourism */}
                      <Route path="/tourism/spots" element={<ContentPage title="Tourist Spots" fetchData={tourismApi.getSpots} renderContent={(data) => <SpotsView data={data} />} />} />
                      <Route path="/tourism/festivities" element={<ContentPage title="Festivities" fetchData={tourismApi.getFestivities} renderContent={(data) => <FestivitiesView data={data} />} />} />
                      <Route path="/tourism/delicacies" element={<ContentPage title="Local Delicacies" fetchData={tourismApi.getDelicacies} renderContent={(data) => <DelicaciesView data={data} />} />} />

                      {/* Forms */}
                      <Route path="/forms/business" element={<BusinessPermitPage />} />
                      <Route path="/forms/building" element={<BuildingPermitPage />} />
                      <Route path="/forms/zoning" element={<ZoningClearancePage />} />

                      {/* Access Control & Fallback Routes */}
                      <Route path="/access-denied" element={<AccessDenied />} />
                      <Route path="*" element={<NotFound />} />
                    </Route>
                    <Route element={<ProtectedRoute roles={STAFF_ROLES} />}>
                      <Route path="/admin" element={<AdminDashboard />} />
                      <Route path="/dashboard" element={<AdminDashboard />} />
                      <Route path="/cms" element={<AdminDashboard />} />
                      <Route path="/manage/*" element={<AdminDashboard />} />
                    </Route>
                  </Route>
                </Routes>
              </Router>
            </AuthProvider>
          </LanguageProvider>
        </UIProvider>
      </AppConfigProvider>
    </ErrorBoundary>
  );
}
