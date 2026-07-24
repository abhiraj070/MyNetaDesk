import { Suspense } from "react";

import { Home } from "./home";

/**
 * A server shell whose only job is to keep this route prerenderable.
 *
 * `Home` reads the `?share=` deep link through `useSearchParams()`, which
 * requires a Suspense boundary: everything inside it renders on the client,
 * while this shell stays static and CDN-cacheable. Taking `searchParams` as a
 * page prop instead — even just to forward it — marks the whole route
 * dynamic, and reading `window.location` in the client is what caused the
 * hydration mismatch both of these replaced.
 */
export default function Page() {
  return (
    <Suspense>
      <Home />
    </Suspense>
  );
}
