/// <reference types="vite/client" />

// Per-icon deep imports (e.g. 'lucide-react/dist/esm/icons/chevron-left') keep
// lucide-react's icon barrel out of the bundle, but only the main package
// entry ships type declarations.
declare module 'lucide-react/dist/esm/icons/*' {
  import type { LucideIcon } from 'lucide-react';
  const icon: LucideIcon;
  export default icon;
}
