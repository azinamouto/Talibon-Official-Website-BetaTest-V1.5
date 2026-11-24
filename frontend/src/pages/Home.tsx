import Hero from "../components/Hero";
import About from "../components/About";
import Services from "../components/Services";
import Tourism from "../components/Tourism";
import PopularServices from "../components/PopularServices";
import MunicipalOffices from "../components/MunicipalOffices";
import BarangaySelector from "../components/BarangaySelector";
import CitizensCharterSection from "../components/CitizensCharterSection";
import TransparencyGovernance from "../components/TransparencyGovernance";
import ConnectWithTalibon from "../components/ConnectWithTalibon";
import EmergencyHotlines from "../components/EmergencyHotlines";
import ServiceNavigator from "../components/ServiceNavigator";
import NewsTodaySection from "../components/NewsTodaySection";
import LguEventsSection from "../components/LguEventsSection";
import OrtsUpdatesSection from "../components/OrtsUpdatesSection";

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <NewsTodaySection />
      <LguEventsSection />
      <OrtsUpdatesSection />
      <ServiceNavigator />
      <PopularServices />
      <BarangaySelector />
      <MunicipalOffices />
      <Services />
      <CitizensCharterSection />
      <TransparencyGovernance />
      <Tourism />
      <ConnectWithTalibon />
      <EmergencyHotlines />
    </main>
  );
}
