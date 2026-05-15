import { RoadmapStudio } from "@/components/roadmap-studio";
import { getRoadmapItems } from "@/lib/roadmap";

export default async function RoadmapPage() {
  const items = await getRoadmapItems();
  return <RoadmapStudio initialItems={items} />;
}
