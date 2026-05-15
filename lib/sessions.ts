import type { SessionConfig } from "@/lib/types";

export const SESSION_OPTIONS: SessionConfig[] = [
  {
    id: "main-stage",
    name: "Main Stage",
    description: "Opening keynote, shared announcements, and closing remarks.",
    room: "Hall A",
  },
  {
    id: "ai-procurement",
    name: "AI in Procurement",
    description: "Practical AI workflows for procurement teams.",
    room: "Room Birch",
  },
  {
    id: "future-p2p",
    name: "Future of P2P",
    description: "New operating models for procure-to-pay teams.",
    room: "Room Cedar",
  },
  {
    id: "customer-case",
    name: "Customer Case",
    description: "Live case study and implementation lessons.",
    room: "Room Elm",
  },
  {
    id: "product-roadmap",
    name: "Product Roadmap",
    description: "Upcoming platform direction and release themes.",
    room: "Room Oak",
  },
];

export function getSessionById(sessionId: string) {
  return SESSION_OPTIONS.find((session) => session.id === sessionId) ?? null;
}
