import { PoliticalBrief } from "@/components/brief/PoliticalBrief";

export const metadata = {
  title: "Political Brief — MyNetaji",
  description: "Today's political brief from trusted news sources.",
};

/**
 * A server shell whose only job is to render the brief. The feed itself is
 * client-side: it reads the chosen language out of storage and fetches through
 * the same axios instance as the rest of the app.
 */
export default function BriefPage() {
  return <PoliticalBrief />;
}
