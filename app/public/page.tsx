import { PublicRoadmap } from "@/components/public-roadmap";
import { getPublicRoadmapItems } from "@/lib/roadmap";

export default async function PublicPage() {
  const items = await getPublicRoadmapItems();
  return <PublicRoadmap items={items} />;
}
