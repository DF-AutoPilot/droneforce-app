import { db, storage, DEBUG_MODE } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc,
  orderBy,
  DocumentData
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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

const tasksCollection = collection(db, 'tasks');

// Mock data for UI debugging when running without env vars
const MOCK_TASKS: Task[] = [
  {
    id: '123456789',
    creator: 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS',
    location: '37.7749,-122.4194',
    areaSize: 200,
    altitude: 100,
    duration: 600,
    geofencingEnabled: true,
    description: 'Survey of Golden Gate Park area',
    status: 'created',
    createdAt: Date.now() - 86400000, // 1 day ago
  },
  {
    id: '987654321',
    creator: 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS',
    operator: '8765ods2d88urkdnKs283JsdkjhFdkw63HKdsKw0928k',
    location: '37.3382,-121.8863',
    areaSize: 150,
    altitude: 80,
    duration: 450,
    geofencingEnabled: true,
    description: 'Downtown San Jose monitoring',
    status: 'accepted',
    createdAt: Date.now() - 172800000, // 2 days ago
    acceptedAt: Date.now() - 86400000, // 1 day ago
  },
  {
    id: '456789123',
    creator: '8765ods2d88urkdnKs283JsdkjhFdkw63HKdsKw0928k',
    operator: 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS',
    location: '37.4419,-122.1430',
    areaSize: 300,
    altitude: 120,
    duration: 900,
    geofencingEnabled: false,
    description: 'Palo Alto tech campus surveillance',
    status: 'completed',
    createdAt: Date.now() - 259200000, // 3 days ago
    acceptedAt: Date.now() - 172800000, // 2 days ago
    completedAt: Date.now() - 86400000, // 1 day ago
    arweaveTxId: 'ar:tx:12345abcde67890fghijk',
    logHash: '0x123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    signature: '0xabcdef123456789abcdef123456789abcdef123456789abcdef123456789abc',
  },
  {
    id: '789123456',
    creator: '8765ods2d88urkdnKs283JsdkjhFdkw63HKdsKw0928k',
    operator: 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS',
    location: '37.8715,-122.2730',
    areaSize: 250,
    altitude: 90,
    duration: 750,
    geofencingEnabled: true,
    description: 'Berkeley campus mapping project',
    status: 'verified',
    createdAt: Date.now() - 345600000, // 4 days ago
    acceptedAt: Date.now() - 259200000, // 3 days ago
    completedAt: Date.now() - 172800000, // 2 days ago
    verifiedAt: Date.now() - 86400000, // 1 day ago
    arweaveTxId: 'ar:tx:67890fghijk12345abcde',
    logHash: '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567',
    signature: '0x123456789abcdef123456789abcdef123456789abcdef123456789abcdef12',
    verificationResult: true,
    verificationReportHash: '0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
  }
];

// Create a new task
export async function createTask(task: Omit<Task, 'createdAt' | 'status'>) {
  // If in debug mode, just return a mock task without Firebase interaction
  if (DEBUG_MODE) {
    const newTask: Task = {
      ...task,
      status: 'created',
      createdAt: Date.now()
    };
    console.log('[DEBUG] Created task:', newTask);
    return newTask;
  }
  
  // Normal Firebase operation
  const taskRef = doc(tasksCollection, task.id);
  const newTask: Task = {
    ...task,
    status: 'created',
    createdAt: Date.now()
  };
  await setDoc(taskRef, newTask);
  return newTask;
}

// Get all tasks
export async function getTasks(): Promise<Task[]> {
  // If in debug mode, return mock tasks
  if (DEBUG_MODE) {
    console.log('[DEBUG] Returning mock tasks');
    return [...MOCK_TASKS];
  }
  
  // Normal Firebase query
  const q = query(tasksCollection, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as Task);
}

// Get tasks by creator
export async function getTasksByCreator(creator: string): Promise<Task[]> {
  // If in debug mode, filter mock tasks
  if (DEBUG_MODE) {
    console.log('[DEBUG] Returning mock tasks for creator:', creator);
    return MOCK_TASKS.filter(task => task.creator === creator);
  }
  
  // Normal Firebase query
  const q = query(tasksCollection, where('creator', '==', creator), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as Task);
}

// Get tasks by operator
export async function getTasksByOperator(operator: string): Promise<Task[]> {
  // If in debug mode, filter mock tasks
  if (DEBUG_MODE) {
    console.log('[DEBUG] Returning mock tasks for operator:', operator);
    return MOCK_TASKS.filter(task => task.operator === operator);
  }
  
  // Normal Firebase query
  const q = query(tasksCollection, where('operator', '==', operator), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as Task);
}

// Get a task by ID
export async function getTaskById(id: string): Promise<Task | null> {
  // If in debug mode, find the task in our mock data
  if (DEBUG_MODE) {
    console.log('[DEBUG] Fetching mock task by ID:', id);
    const mockTask = MOCK_TASKS.find(task => task.id === id);
    return mockTask || null;
  }
  
  // Normal Firebase operation
  const taskRef = doc(tasksCollection, id);
  const taskDoc = await getDoc(taskRef);
  
  if (taskDoc.exists()) {
    return taskDoc.data() as Task;
  }
  
  return null;
}

// Update a task when accepted
export async function acceptTask(id: string, operator: string): Promise<void> {
  // If in debug mode, just log the operation
  if (DEBUG_MODE) {
    console.log('[DEBUG] Accepting task:', id, 'by operator:', operator);
    return;
  }
  
  // Normal Firebase operation
  const taskRef = doc(tasksCollection, id);
  await updateDoc(taskRef, {
    operator,
    status: 'accepted',
    acceptedAt: Date.now()
  });
}

// Update a task when completed
export async function completeTask(
  id: string, 
  arweaveTxId: string, 
  logHash: string, 
  signature: string,
  logFile?: File
): Promise<void> {
  // If in debug mode, just log the operation
  if (DEBUG_MODE) {
    console.log('[DEBUG] Completing task:', id);
    console.log('[DEBUG] arweaveTxId:', arweaveTxId);
    console.log('[DEBUG] logHash:', logHash);
    console.log('[DEBUG] signature:', signature);
    console.log('[DEBUG] logFile provided:', !!logFile);
    return;
  }
  
  // Normal Firebase operation
  const taskRef = doc(tasksCollection, id);
  
  // Upload log file if provided
  if (logFile) {
    const storageRef = ref(storage, `logs/${id}.bin`);
    await uploadBytes(storageRef, logFile);
  }
  
  await updateDoc(taskRef, {
    arweaveTxId,
    logHash,
    signature,
    status: 'completed',
    completedAt: Date.now()
  });
}

// Update a task when verified
export async function verifyTask(
  id: string, 
  verificationResult: boolean, 
  verificationReportHash: string
): Promise<void> {
  // If in debug mode, just log the operation
  if (DEBUG_MODE) {
    console.log('[DEBUG] Verifying task:', id);
    console.log('[DEBUG] verificationResult:', verificationResult);
    console.log('[DEBUG] verificationReportHash:', verificationReportHash);
    return;
  }
  
  // Normal Firebase operation
  const taskRef = doc(tasksCollection, id);
  await updateDoc(taskRef, {
    verificationResult,
    verificationReportHash,
    status: 'verified',
    verifiedAt: Date.now()
  });
}

// Get download URL for a task log
export async function getTaskLogUrl(id: string): Promise<string | null> {
  // If in debug mode, return a mock URL
  if (DEBUG_MODE) {
    console.log('[DEBUG] Returning mock log URL for task:', id);
    return `https://example.com/mock-logs/${id}.bin`;
  }
  
  // Normal Firebase operation
  try {
    const storageRef = ref(storage, `logs/${id}.bin`);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error) {
    console.error('Error getting task log URL:', error);
    return null;
  }
}
