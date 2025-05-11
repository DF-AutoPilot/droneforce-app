/**
 * DroneForce Protocol Task Interface
 * Represents a drone booking task with all its properties
 */
export interface Task {
  id: string;
  creator: string;
  operator?: string;
  location: string;
  areaSize: number;
  altitude: number;
  duration: number;
  geofencingEnabled: boolean;
  description: string;
  status: 'created' | 'accepted' | 'completed' | 'verified';
  createdAt: number;
  acceptedAt?: number;
  completedAt?: number;
  verifiedAt?: number;
  arweaveTxId?: string;
  logHash?: string;
  signature?: string;
  verificationResult?: boolean;
  verificationReportHash?: string;
}
