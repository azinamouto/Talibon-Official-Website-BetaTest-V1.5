import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export default function ErrorPage() {
  return <div className="mx-auto max-w-xl px-4 py-16">
    <Card>
      <h1 className="mb-4 text-2xl font-bold">Something went wrong</h1>
      <p className="mb-6 text-muted">We could not display this page. Try reloading, or return to the home page.</p>
      <div className="flex flex-wrap gap-4">
        <Button onClick={() => window.location.reload()}>Reload page</Button>
        <a className="ui-focus rounded-control p-3 text-action underline" href="/">Go to home page</a>
      </div>
    </Card>
  </div>;
}
