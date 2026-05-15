export type SessionConfig = {
  id: string;
  name: string;
  description: string;
  room: string;
};

export type RoadmapItemRecord = {
  id: string;
  title: string;
  description?: string | null;
  area: string;
  theme?: string | null;
  quarter: string;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  confidence: string;
  impact: string;
  effort: string;
  owner?: string | null;
  tags: string[];
  dependencies: string[];
  dependents?: string[];
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type RoadmapItemInput = {
  title: string;
  description?: string;
  area: string;
  theme?: string;
  quarter: string;
  startDate?: string;
  endDate?: string;
  status: string;
  confidence: string;
  impact: string;
  effort: string;
  owner?: string;
  tags: string[];
  dependencyIds: string[];
  isPublic: boolean;
  [key: string]: unknown;
};

export type RoadmapFilters = {
  search: string;
  areas: string[];
  statuses: string[];
  quarters: string[];
  tags: string[];
  owners: string[];
  publicOnly: boolean;
  [key: string]: unknown;
};

export type RoadmapMetrics = {
  total: number;
  publicCount: number;
  [key: string]: unknown;
};

export type RoadmapViewRecord = {
  id: string;
  name: string;
  isPublic: boolean;
  filters: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type SavedView = {
  id: string;
  name: string;
  isPublic?: boolean;
  filters: Record<string, unknown>;
  createdAt: string;
};

export const AREA_OPTIONS = [
  "Product",
  "Platform",
  "UX",
  "Security",
  "Other",
];

export const QUARTER_OPTIONS = [
  "Q1",
  "Q2",
  "Q3",
  "Q4",
];

export const STATUS_OPTIONS = [
  "Planned",
  "In Progress",
  "Shipped",
];

export const CONFIDENCE_OPTIONS = [
  "Low",
  "Medium",
  "High",
];

export const IMPACT_OPTIONS = [
  "Low",
  "Medium",
  "High",
];

export const EFFORT_OPTIONS = [
  "Small",
  "Medium",
  "Large",
];

export type AttendeeInput = {
  name: string;
  title: string;
  email: string;
};

export type CheckInSource = "scan" | "manual";

export type CheckInRecord = {
  id: string;
  attendeeName: string;
  attendeeTitle: string;
  attendeeEmail: string;
  emailKey: string;
  sessionId: string;
  sessionName: string;
  timestamp: Date;
  scannedBy: string | null;
  source: CheckInSource;
};

export type CheckInSubmission = {
  attendee: AttendeeInput;
  session: SessionConfig;
  scannedBy?: string | null;
  source: CheckInSource;
};

export type CheckInResult =
  | { status: "success"; record: CheckInRecord }
  | { status: "duplicate"; existing: { attendeeName: string; timestamp: Date } };
