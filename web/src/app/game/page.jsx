import { GameScreen } from "@/components/game/GameScreen";

export const metadata = {
  title: "Slap or Rose — MyNetaji",
  description: "Give today's leader a slap or a rose. Your verdict, your voice.",
};

/**
 * A server shell whose only job is to render the game, mirroring `/brief`.
 * The subject it judges is resolved client-side from the location and the
 * selection held above the router (see `lib/subject`), so this route needs no
 * data of its own.
 */
export default function GamePage() {
  return <GameScreen />;
}
