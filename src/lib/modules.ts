import {
  Landmark,
  Megaphone,
  PhoneCall,
  Headset,
  Building2,
  Siren,
  Sprout,
  Leaf,
  ClipboardList,
  Mic,
  type LucideIcon,
} from "lucide-react";

export interface ModuleDef {
  id: string;
  title: string;
  short: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

export const MODULES: ModuleDef[] = [
  {
    id: "scheme-ai",
    title: "Government Scheme Awareness AI",
    short: "Scheme AI",
    description:
      "AI chatbot and voice assistant for scheme discovery, eligibility checks and application guidance.",
    icon: Landmark,
    href: "/portal/scheme-ai",
  },
  {
    id: "election",
    title: "Election Campaigning Assistant",
    short: "Campaigns",
    description:
      "Speech and manifesto generation, voter segment analysis and multi-channel campaign outreach.",
    icon: Megaphone,
    href: "/portal/election",
  },
  {
    id: "helpline",
    title: "Public Information Helpline",
    short: "Helpline",
    description:
      "Voice and chat bots for government information, department directory and citizen query tracking.",
    icon: Headset,
    href: "/portal/helpline",
  },
  {
    id: "smart-city",
    title: "Smart City Citizen Assistant",
    short: "Smart City",
    description:
      "Real-time traffic, water, power and transit updates with multilingual citizen notifications.",
    icon: Building2,
    href: "/portal/smart-city",
  },
  {
    id: "disaster",
    title: "Disaster & Emergency Response",
    short: "Disaster Alerts",
    description:
      "Emergency dashboard, mass SMS/call broadcast engine, relief locators and safety notifications.",
    icon: Siren,
    href: "/portal/disaster",
  },
  {
    id: "rural",
    title: "Rural Development Information Bot",
    short: "Rural Dev",
    description:
      "Multilingual assistant for village programs, subsidies, employment schemes and announcements.",
    icon: Sprout,
    href: "/portal/rural",
  },
  {
    id: "agriculture",
    title: "Agriculture Advisory Assistant",
    short: "Agriculture",
    description:
      "Crop, weather and soil advisory with AI photo analysis for pest and disease detection.",
    icon: Leaf,
    href: "/portal/agriculture",
  },
  {
    id: "municipal",
    title: "Municipal Service Automation",
    short: "Municipal",
    description:
      "Complaint registration, photo uploads, officer routing, status tracking and analytics.",
    icon: ClipboardList,
    href: "/portal/municipal",
  },
  {
    id: "voice",
    title: "Digital Governance Voice Interface",
    short: "Voice Assistant",
    description:
      "Conversational, multilingual voice navigation for services, complaints and scheme discovery.",
    icon: Mic,
    href: "/portal/voice",
  },
];

export const TRUST_POINTS = [
  { title: "Government Ready", desc: "Built to comply with public-sector standards and procurement requirements." },
  { title: "Enterprise Security", desc: "End-to-end encryption, audit logs and SOC-grade access controls." },
  { title: "Role Based Access", desc: "Granular permissions across departments, officers and administrators." },
  { title: "AI Powered Workflows", desc: "Automate triage, routing and citizen responses at national scale." },
  { title: "Multilingual Support", desc: "Serve citizens across 8+ Indian languages out of the box." },
  { title: "Voice First Governance", desc: "Natural language voice access for every core citizen service." },
];

export const STATS = [
  { value: "10M+", label: "Citizens Served" },
  { value: "500+", label: "Government Programs" },
  { value: "99.9%", label: "Platform Uptime" },
  { value: "24/7", label: "AI Assistance" },
];
