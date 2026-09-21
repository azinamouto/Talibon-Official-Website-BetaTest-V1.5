# Frontend Development Skill

Specialized skill for TAL.GOV frontend development using React, TypeScript, and Vite.

## When to Use This Skill

Use this skill when:
- Creating or modifying React components
- Implementing UI features
- Working with routing and navigation
- Integrating with backend APIs
- Managing state and context
- Implementing forms and user interactions

## Efficient Workflow

### 1. Understand Component Structure
```bash
# Check existing component patterns
read frontend/src/components/[Component].tsx
read frontend/src/pages/[Page].tsx
```

### 2. Follow Design System
```bash
# Check existing UI components
find frontend/src/components -name "*.tsx"
read frontend/src/types/index.ts
```

### 3. Use Code Search for Patterns
```bash
# Search for similar implementations
grep "useState" frontend/src/components/
grep "useEffect" frontend/src/pages/
grep "axios" frontend/src/services/
```

### 4. Implementation Steps
1. Check existing similar components
2. Follow established component patterns
3. Use TypeScript interfaces from types directory
4. Implement proper error handling
5. Add loading states
6. Test responsiveness

## Cost-Effective Operations

### Targeted Component Reading
```typescript
// Read only relevant component files
read frontend/src/components/[Component].tsx
read frontend/src/types/[Type].ts
read frontend/src/services/[service].ts
```

### Pattern-Based Development
```typescript
// Follow existing component patterns
// Use established hook patterns
// Maintain consistent styling
// Follow TypeScript best practices
```

### Efficient Styling
```typescript
// Use Tailwind CSS consistently
// Follow design system tokens
// Implement responsive design
// Use existing utility classes
```

## Common Patterns

### Functional Component Pattern
```typescript
interface ComponentProps {
  title: string;
  data: DataType[];
  onAction: (id: string) => void;
}

export const Component: React.FC<ComponentProps> = ({
  title,
  data,
  onAction
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Component logic
  }, []);

  if (loading) return <SkeletonLoader />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="component-container">
      {/* Component JSX */}
    </div>
  );
};
```

### API Integration Pattern
```typescript
const { data, loading, error, refetch } = useApiCall(
  async () => {
    const response = await api.get('/endpoint');
    return response.data;
  },
  []
);
```

### Form Pattern
```typescript
const [formData, setFormData] = useState<FormData>({
  field1: '',
  field2: ''
});

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setFormData({
    ...formData,
    [e.target.name]: e.target.value
  });
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  // Form submission logic
};
```

## Component Organization

### Component Structure
```
frontend/src/components/
├── ui/              # Reusable UI components
├── layout/          # Layout components
├── forms/           # Form components
└── [feature]/       # Feature-specific components
```

### Page Structure
```
frontend/src/pages/
├── [Page].tsx       # Page components
└── [category]/      # Categorized pages
    └── [SubPage].tsx
```

## TypeScript Best Practices

### Interface Definitions
```typescript
// Define clear interfaces
interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

interface ComponentProps {
  user: UserData;
  onUpdate: (user: UserData) => void;
}
```

### Type Safety
```typescript
// Use proper typing
const [data, setData] = useState<DataType | null>(null);
const handleClick = (id: string): void => {
  // Type-safe operations
};
```

## State Management

### Context Pattern
```typescript
// Use existing contexts
const { user, loading } = useAuthContext();
const { theme, setTheme } = useThemeContext();
```

### Local State
```typescript
// Use useState for component state
const [isOpen, setIsOpen] = useState(false);
const [items, setItems] = useState<ItemType[]>([]);
```

### Server State
```typescript
// Use API services for server state
const { data, loading } = useApiCall(() => 
  api.get('/endpoint')
);
```

## Routing Patterns

### Route Definition
```typescript
// In App.tsx
<Route path="/page" element={<Page />} />
<Route path="/page/:id" element={<PageDetail />} />
```

### Navigation
```typescript
// Use React Router
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate('/target-page');
```

### Protected Routes
```typescript
// Use existing auth context
{user ? <ProtectedComponent /> : <Login />}
```

## Error Handling

### Error Boundaries
```typescript
// Wrap components with ErrorBoundary
<ErrorBoundary fallback={<ErrorFallback />}>
  <Component />
</ErrorBoundary>
```

### API Error Handling
```typescript
try {
  const response = await api.get('/endpoint');
  setData(response.data);
} catch (error) {
  setError('Failed to load data');
  console.error('API Error:', error);
}
```

## Performance Optimization

### Code Splitting
```typescript
// Lazy load components
const HeavyComponent = lazy(() => import('./HeavyComponent'));

<Suspense fallback={<SkeletonLoader />}>
  <HeavyComponent />
</Suspense>
```

### Memoization
```typescript
// Use React.memo for expensive components
export const ExpensiveComponent = React.memo(({ data }) => {
  // Component logic
});
```

### Lazy Loading
```typescript
// Use lazy loading for routes
const LazyPage = lazy(() => import('./pages/Page'));
```

## Styling Guidelines

### Tailwind CSS Usage
```typescript
// Use utility classes consistently
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
  {/* Content */}
</div>
```

### Responsive Design
```typescript
// Use responsive prefixes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid */}
</div>
```

### Custom Styles
```typescript
// Use style variants from existing components
// Follow design system tokens
// Maintain consistency with existing UI
```

## Accessibility

### ARIA Labels
```typescript
<button aria-label="Close dialog" onClick={onClose}>
  <XIcon />
</button>
```

### Keyboard Navigation
```typescript
// Ensure keyboard accessibility
<button
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
>
  Action
</button>
```

### Semantic HTML
```typescript
// Use semantic elements
<nav>...</nav>
<main>...</main>
<section>...</section>
<article>...</article>
```

## Common Hooks

### Custom Hooks
```typescript
// Create reusable custom hooks
const useApiCall = <T,>(
  apiFunction: () => Promise<T>,
  dependencies: any[] = []
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hook implementation
  return { data, loading, error, refetch };
};
```

## Testing Patterns

### Component Testing
```typescript
// Test component behavior
test('renders component with props', () => {
  render(<Component title="Test" data={[]} />);
  expect(screen.getByText('Test')).toBeInTheDocument();
});
```

### Integration Testing
```typescript
// Test component interactions
test('handles user interaction', () => {
  render(<Component />);
  fireEvent.click(screen.getByRole('button'));
  expect(mockFunction).toHaveBeenCalled();
});
```

## Quick Reference

### Common Hooks
- `useState` - Component state
- `useEffect` - Side effects
- `useContext` - Context consumption
- `useCallback` - Memoized callbacks
- `useMemo` - Memoized values
- `useRef` - DOM references

### Common Patterns
- Functional components with hooks
- TypeScript interfaces for props
- Error boundaries for error handling
- Lazy loading for performance
- Responsive design with Tailwind

## Checklist Before Completion

- [ ] Follow existing component patterns
- [ ] Use TypeScript interfaces properly
- [ ] Implement error handling
- [ ] Add loading states
- [ ] Test responsiveness
- [ ] Check accessibility
- [ ] Follow styling guidelines
- [ ] Test user interactions
- [ ] Verify performance
- [ ] Update documentation if needed