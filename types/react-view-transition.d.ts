// React's <ViewTransition> ships in the App Router's bundled React canary, but
// the stable @types/react (19.2) doesn't declare it yet. This augments the
// module so we can `import { ViewTransition } from "react"` with types.
// Remove once @types/react exports it natively.
import "react";

declare module "react" {
  type ViewTransitionClass = string | "none" | "auto";

  interface ViewTransitionProps {
    children?: import("react").ReactNode;
    name?: string;
    enter?: ViewTransitionClass | Record<string, ViewTransitionClass>;
    exit?: ViewTransitionClass | Record<string, ViewTransitionClass>;
    share?: ViewTransitionClass | Record<string, ViewTransitionClass>;
    update?: ViewTransitionClass | Record<string, ViewTransitionClass>;
    default?: ViewTransitionClass | Record<string, ViewTransitionClass>;
    onEnter?: (instance: Element, types: string[]) => void;
    onExit?: (instance: Element, types: string[]) => void;
    onShare?: (instance: Element, types: string[]) => void;
    onUpdate?: (instance: Element, types: string[]) => void;
  }

  export const ViewTransition: (
    props: ViewTransitionProps,
  ) => import("react").ReactElement | null;
}
