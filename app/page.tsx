import MemoryGardenApp from "./components/MemoryGardenApp";

// Customize your display names & starting year here:
const PARTNER_NAMES = ["David", "Julliana"] as const;
const DEFAULT_YEAR = 2026;

export default function HomePage() {
  return (
    <MemoryGardenApp
      partnerOptions={PARTNER_NAMES}
      defaultYear={DEFAULT_YEAR}
    />
  );
}
