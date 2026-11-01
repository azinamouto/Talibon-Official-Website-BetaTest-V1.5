import { Link } from 'react-router-dom';
export default function PopularServices() {
  return <section className="bg-brand-bg px-4 py-10 text-center" id="popular-services">
    <h2 className="text-2xl font-bold">Electronic Services</h2>
    <p className="mt-3">To Be Implemented</p>
    <Link to="/e-services" className="ui-focus mt-4 inline-block underline">Electronic services information</Link>
  </section>;
}
