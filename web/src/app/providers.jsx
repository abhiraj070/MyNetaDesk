"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { useState } from "react";

import { LanguageProvider } from "@/lib/i18n";
import { LocationProvider } from "@/lib/location";
import { OnboardingProvider } from "@/lib/onboarding";

export function Providers({ children }) {
  // Created in state so the client isn't shared between requests on the server
  // and isn't torn down on every re-render.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/*
       * `reducedMotion="user"` makes every motion component in the tree honour
       * the OS setting without each one having to ask: transform and layout
       * animations are dropped, opacity is kept. The CSS block in globals.css
       * only reaches CSS transitions/animations, so this is what covers the
       * springs, the idle float and the entrance stagger.
       */}
      <MotionConfig reducedMotion="user">
        {/*
         * Both providers sit above the router's page slot, so the language
         * choice and the resolved location outlive a navigation to `/brief`
         * and back.
         */}
        <LanguageProvider>
          <LocationProvider>
            {/*
             * The onboarding layer sits alongside them for the same reason:
             * "has this user seen the tutorial" and the registry of
             * highlightable elements both have to outlive a navigation, so
             * replaying the tour from the Info sheet finds its targets
             * whichever route the user arrived on.
             */}
            <OnboardingProvider>{children}</OnboardingProvider>
          </LocationProvider>
        </LanguageProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
