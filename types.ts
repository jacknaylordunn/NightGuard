
export type IncidentType = 'disorderly' | 'intox' | 'violence' | 'drugs' | 'harassment' | 'other';
export type Gender = 'male' | 'female' | 'other';
export type AgeRange = '18-21' | '22-30' | '31-40' | '41+';
export type Location = string; 
export type RejectionReason = 'Dress Code' | 'Intoxicated' | 'No ID' | 'Banned' | 'Attitude' | 'Fake ID';
export type VerificationMethod = 'manual' | 'nfc' | 'qr';

export type UserRole = 'owner' | 'manager' | 'security' | 'superadmin' | 'floor_staff';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  companyId: string;
  venueId: string;
  role: UserRole;
  status?: 'active' | 'suspended'; 
  allowedVenues?: string[]; 
}

export type SubscriptionPlan = 'free' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'cancelled';

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'checkbox' | 'select';
  options?: string[]; 
  required: boolean;
}

export interface Company {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt?: string; 
  maxVenues?: number; 
  customIncidentFields?: CustomField[]; 
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface Checkpoint {
  id: string;
  name: string;
  description?: string;
}

export interface Venue {
  id: string;
  name: string;
  companyId: string;
  maxCapacity: number;
  themeColor: string;
  shortCode: string; 
  createdAt?: string;
  locations?: string[]; 
  checkpoints?: Checkpoint[]; // Physical locations for QR/NFC scanning
}

export interface BannedPerson {
  id: string;
  fullName: string;
  nickname?: string;
  description: string; 
  banDate: string;
  banDuration: '24h' | '1 Month' | '6 Months' | 'Life';
  reason: IncidentType;
  riskLevel: 'low' | 'medium' | 'high';
  addedBy: string; 
  companyId: string;
  photoUrl?: string; 
}

export interface EjectionLog {
  id: string;
  timestamp: string;
  gender: Gender;
  ageRange: AgeRange;
  reason: IncidentType; 
  location: Location;
  icCode?: string; // Identity Code (IC1-IC6)
  details: string; 
  actionTaken: string; 
  departure: string; 
  authoritiesInvolved: string[]; 
  cctvRecorded: boolean;
  bodyCamRecorded: boolean; 
  securityBadgeNumber: string; 
  managerName: string;
  customData?: Record<string, any>; 
}

export interface CapacityLog {
  timestamp: string;
  type: 'in' | 'out';
  count: number;
}

export interface PeriodicLog {
  id: string;
  timestamp: string;
  timeLabel: string; // e.g. "22:00"
  countIn: number;
  countOut: number;
  countTotal: number; // In Venue
}

export interface RejectionLog {
  id: string;
  timestamp: string;
  reason: RejectionReason;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  timestamp?: string;
  checkedBy?: string;
  verified?: boolean; // True if scan confirmed it
  method?: VerificationMethod;
  checkpointId?: string; // Links to physical checkpoint
}

export interface ChecklistDefinition {
  id: string;
  label: string;
  type: 'pre' | 'post';
  checkpointId?: string; // Optional requirement to scan a specific checkpoint
}

export interface PatrolLog {
  id: string;
  time: string;
  area: string;
  checkedBy: string;
  method: VerificationMethod;
  checkpointId?: string;
}

// --- NEW COMPLIANCE TYPES ---
export type ComplianceType = 'toilet_check' | 'spill' | 'hazard' | 'maintenance' | 'fire_exit' | 'cleaning' | 'other';
export type ComplianceStatus = 'open' | 'resolved';

export interface ComplianceLog {
  id: string;
  timestamp: string;
  type: ComplianceType;
  location: string;
  description: string;
  photoUrl?: string;
  status: ComplianceStatus;
  loggedBy: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
}

// Briefing for the night
export interface Briefing {
  id: string;
  text: string;
  setBy: string;
  timestamp: string;
  active: boolean;
  priority: 'info' | 'alert';
}

// Global Alert System
export interface Alert {
  id: string;
  type: 'sos' | 'bolo' | 'info';
  message: string;
  senderName: string;
  location?: string;
  timestamp: string;
  active: boolean;
}

export interface SessionData {
  id: string;
  date: string;
  shiftDate: string;
  startTime: string; 
  lastUpdated: string;
  venueName: string;
  currentCapacity: number;
  maxCapacity: number;
  logs: CapacityLog[];
  rejections: RejectionLog[];
  ejections: EjectionLog[]; 
  preEventChecks: ChecklistItem[];
  postEventChecks: ChecklistItem[];
  patrolLogs: PatrolLog[];
  periodicLogs: PeriodicLog[];
  complianceLogs: ComplianceLog[]; // New field
  briefing?: Briefing;
}

export interface TicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  role: 'user' | 'admin';
  message: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  companyId: string;
  companyName: string;
  userId: string;
  userEmail: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'low' | 'normal' | 'high';
  createdAt: string;
  lastUpdated: string;
  messages: TicketMessage[];
}

export const DEFAULT_PRE_CHECKS: ChecklistDefinition[] = [
  { id: 'def_1', label: 'Fire exits unlocked and clear', type: 'pre' },
  { id: 'def_2', label: 'Door staff signed-in', type: 'pre' },
  { id: 'def_3', label: 'SIA Licenses displayed', type: 'pre' },
  { id: 'def_4', label: 'Briefing conducted', type: 'pre' },
  { id: 'def_5', label: 'Radios/Cams issued', type: 'pre' },
];

export const DEFAULT_POST_CHECKS: ChecklistDefinition[] = [
  { id: 'def_6', label: 'Venue clear of customers', type: 'post' },
  { id: 'def_7', label: 'Fire Exits secured', type: 'post' },
  { id: 'def_8', label: 'Equipment returned', type: 'post' },
  { id: 'def_9', label: 'Debrief completed', type: 'post' },
  { id: 'def_10', label: 'Paperwork filed', type: 'post' },
];
