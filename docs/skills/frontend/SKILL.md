# ZiumSync Frontend Agent Playbook

**Target Audience:** AI Coding Assistants, Agents, and Frontend Developers working on the ZiumSync Platform.

This document is the absolute source of truth for generating code in the ZiumSync React frontend. You **MUST** strictly adhere to the patterns, templates, and directory structures defined here.

## 0. The Self-Updating Mandate
Codebases evolve. If you (an AI Agent) are explicitly instructed by the USER to implement a new UI pattern, add a new core dependency, or change the state management strategy, **you MUST update this SKILL.md document** to reflect the new standard before concluding your work. Always keep this playbook perfectly synced with the repository's state.

## 1. Directory Architecture
Always place code in its designated location:
```text
frontend/
├── src/
│   ├── components/  # Reusable UI elements (Button, Dialog, etc.)
│   ├── hooks/       # React Query and custom logic
│   ├── lib/         # API fetchers and Zod/TypeScript types
│   ├── views/       # Full page layouts (Connections, Pipelines)
│   └── context/     # Global state (WorkspaceContext)
```

## 2. Hard Guardrails (TypeScript & Build)
We employ strict build checks in our CI/CD pipeline:
- `bun run tsc --noEmit` (Strict Static Typing)
- `bun run build` (Vite Production Build)

**Rules:**
- All new variables, props, and function signatures **MUST** have accurate TypeScript types.
- Avoid using `any`. Use generics or `unknown` if necessary.
- Never commit broken imports.

## 3. Styling Rules (Vanilla CSS ONLY)
- **TailwindCSS is STRICTLY PROHIBITED** in this repository. All styles must use Vanilla CSS.
- **Design Tokens:** All colors, spacing, and typography must use CSS custom variables defined in `frontend/index.css` (e.g., `var(--color-bg)`, `var(--color-accent)`).
- **Glassmorphism Theme:** The UI relies on a dark-mode glassmorphism aesthetic. Overlays and dialogs should use the `.glass` class.

## 4. State Management & API Hook Template (TanStack Query)
Never store server state in local `useState` or `useContext`. Always use standard `useQuery` for fetching and `useMutation` for POST/PUT/DELETE operations. Define API fetchers in `src/lib/api.ts` and wrap them in custom hooks in `src/hooks/`.

**Template for `src/hooks/useData.ts`:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchData, createData } from '../lib/api';
import type { DataPayload } from '../lib/types';

const QK = 'my-data';

export function useMyData() {
  return useQuery({
    queryKey: [QK],
    queryFn: fetchData,
  });
}

export function useCreateData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DataPayload) => createData(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [QK] });
      toast.success('Data created successfully');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
```

## 5. UI Component Template
Components should be functional, use destructuring for props, and rely on standard `lucide-react` icons.

**Template:**
```typescript
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface ExampleProps {
  title: string;
  onAction?: () => void;
}

export function ExampleComponent({ title, onAction }: ExampleProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="card">
      <h3>{title}</h3>
      <Button onClick={onAction}>
        <Plus size={16} /> Add Item
      </Button>
    </div>
  );
}
```

## 6. Observability & User Feedback
- **Toasts:** Always use `toast.success()` or `toast.error()` from `sonner` to provide immediate feedback on mutations.
- **Loading States:** Provide visual feedback using `disabled={isPending}` on buttons and `<LoadingRow />` for large data fetches.
