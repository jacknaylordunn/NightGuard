
export type IncidentType = 'disorderly' | 'intox' | 'violence' | 'drugs' | 'harassment' | 'other';
export type Gender = 'male' | 'female' | 'other';
export type AgeRange = '18-21' | '22-30' | '31-40' | '41+';
export type Location = string; 
export type RejectionReason = 'Dress Code' | 'Intoxicated' | 'No ID' | 'Banned' | 'Attitude' | 'Other';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  companyId: string;
  venueId: string;
  role: 'owner' | 'manager' | 'security' | 'superadmin';
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
  timestamp: string;
  reason: RejectionReason;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  timestamp?: string;
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
  patrolLogs: { time: string; area: string; checked: boolean }[];
  periodicLogs: PeriodicLog[];
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

export const INITIAL_PRE_CHECKS: ChecklistItem[] = [
  { id: '1', label: 'Fire exits unlocked and clear route end', checked: false },
  { id: '2', label: 'Door supervisors signed-in on time sheet', checked: false },
  { id: '3', label: 'Door supervisors displaying SIA License', checked: false },
  { id: '4', label: 'Conduct Door supervisors briefing', checked: false },
  { id: '5', label: 'All new staff inducted and site tour given', checked: false },
  { id: '6', label: 'Check all uniform is company standard', checked: false },
  { id: '7', label: 'Issue radios and Body Cam', checked: false },
  { id: '8', label: 'Deploy staff to position and open doors', checked: false },
];

export const INITIAL_POST_CHECKS: ChecklistItem[] = [
  { id: '1', label: 'Venue clear of all customers', checked: false },
  { id: '2', label: 'All crowd control barriers stored appropriately', checked: false },
  { id: '3', label: 'Fire Exits secured and venue made safe', checked: false },
  { id: '4', label: 'Door supervisors signed out on time sheet', checked: false },
  { id: '5', label: 'All radios/Cams returned and put on charge', checked: false },
  { id: '6', label: 'Diligence record/floor walk complete', checked: false },
  { id: '7', label: 'Debrief of the night incidents and reports', checked: false },
  { id: '8', label: 'All relevant paperwork completed and filed', checked: false },
];