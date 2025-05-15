/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { db, storage, DEBUG_MODE } from './firebase';
import { Task, EscrowPayment } from '@/types/task';
import { logInfo, logError, logDebug, logBlockchain } from './logger';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc,
  orderBy
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Task interface is now imported from @/types/task

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
  logInfo('Creating new task', { taskId: task.id });
  
  // If in debug mode, just return a mock task without Firebase interaction
  if (DEBUG_MODE) {
    const newTask: Task = {
      ...task,
      status: 'created',
      createdAt: Date.now()
    };
    logDebug('Created task in debug mode', newTask);
    return newTask;
  }
  
  try {
    // Normal Firebase operation
    const taskRef = doc(tasksCollection, task.id);
    const newTask: Task = {
      ...task,
      status: 'created',
      createdAt: Date.now()
    };
    logInfo('Saving task to Firestore', { taskId: task.id });
    await setDoc(taskRef, newTask);
    logInfo('Task created successfully', { taskId: task.id });
    return newTask;
  } catch (error) {
    logError('Failed to create task', { error, taskId: task.id });
    throw error;
  }
}

// Get all tasks
export async function getTasks(): Promise<Task[]> {
  logInfo('Fetching all tasks');
  
  // If in debug mode, return mock tasks
  if (DEBUG_MODE) {
    logDebug('Returning mock tasks in debug mode');
    return [...MOCK_TASKS];
  }
  
  try {
    // Normal Firebase query
    const q = query(tasksCollection, orderBy('createdAt', 'desc'));
    logInfo('Executing Firestore query for all tasks');
    const querySnapshot = await getDocs(q);
    const tasks = querySnapshot.docs.map(doc => doc.data() as Task);
    logInfo('Tasks fetched successfully', { count: tasks.length });
    return tasks;
  } catch (error) {
    logError('Failed to fetch tasks', { error });
    throw error;
  }
}

// Get tasks by creator
export async function getTasksByCreator(creator: string): Promise<Task[]> {
  logInfo('Fetching tasks by creator', { creator });
  
  // If in debug mode, filter mock tasks
  if (DEBUG_MODE) {
    logDebug('Returning mock tasks for creator in debug mode', { creator });
    const tasks = MOCK_TASKS.filter(task => task.creator === creator);
    logDebug('Found creator tasks in debug mode', { count: tasks.length });
    return tasks;
  }
  
  try {
    // Normal Firebase query
    const q = query(tasksCollection, where('creator', '==', creator), orderBy('createdAt', 'desc'));
    logInfo('Executing Firestore query for creator tasks', { creator });
    const querySnapshot = await getDocs(q);
    const tasks = querySnapshot.docs.map(doc => doc.data() as Task);
    logInfo('Creator tasks fetched successfully', { creator, count: tasks.length });
    return tasks;
  } catch (error) {
    logError('Failed to fetch creator tasks', { error, creator });
    throw error;
  }
}

// Get tasks by operator
export async function getTasksByOperator(operator: string): Promise<Task[]> {
  logInfo('Fetching tasks by operator', { operator });
  
  // If in debug mode, filter mock tasks
  if (DEBUG_MODE) {
    logDebug('Returning mock tasks for operator in debug mode', { operator });
    const tasks = MOCK_TASKS.filter(task => task.operator === operator);
    logDebug('Found operator tasks in debug mode', { count: tasks.length });
    return tasks;
  }
  
  try {
    // Normal Firebase query
    const q = query(tasksCollection, where('operator', '==', operator), orderBy('createdAt', 'desc'));
    logInfo('Executing Firestore query for operator tasks', { operator });
    const querySnapshot = await getDocs(q);
    const tasks = querySnapshot.docs.map(doc => doc.data() as Task);
    logInfo('Operator tasks fetched successfully', { operator, count: tasks.length });
    return tasks;
  } catch (error) {
    logError('Failed to fetch operator tasks', { error, operator });
    throw error;
  }
}

// Get task by ID
export async function getTaskById(id: string): Promise<Task | null> {
  logInfo('Fetching task by ID', { taskId: id });
  
  // If in debug mode, find in mock tasks
  if (DEBUG_MODE) {
    logDebug('Looking up mock task by ID in debug mode', { taskId: id });
    const mockTask = MOCK_TASKS.find(task => task.id === id);
    if (mockTask) {
      logDebug('Found mock task by ID', { taskId: id });
    } else {
      logDebug('Mock task not found', { taskId: id });
    }
    return mockTask || null;
  }
  
  try {
    // Normal Firebase operation
    const docRef = doc(tasksCollection, id);
    logInfo('Getting task document from Firestore', { taskId: id });
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      logInfo('Task found', { taskId: id });
      return docSnap.data() as Task;
    } else {
      logInfo('Task not found', { taskId: id });
      return null;
    }
  } catch (error) {
    logError('Failed to fetch task by ID', { error, taskId: id });
    throw error;
  }
}

// Update a task when accepted
export async function acceptTask(id: string, operator: string): Promise<void> {
  logBlockchain('Accepting task', { taskId: id, operator });
  
  // If in debug mode, just log the operation
  if (DEBUG_MODE) {
    logDebug('Accepting task in debug mode', { taskId: id, operator });
    return;
  }
  
  try {
    // Normal Firebase operation
    const taskRef = doc(tasksCollection, id);
    logInfo('Updating task status to accepted in Firestore', { taskId: id, operator });
    await updateDoc(taskRef, {
      operator,
      status: 'accepted',
      acceptedAt: Date.now()
    });
    logBlockchain('Task accepted successfully', { taskId: id, operator });
  } catch (error) {
    logError('Failed to accept task', { error, taskId: id, operator });
    throw error;
  }
}

// Update a task when completed
export async function completeTask(
  id: string, 
  arweaveTxId: string, 
  logHash: string, 
  signature: string,
  logFile?: File
): Promise<void> {
  logBlockchain('Completing task', { 
    taskId: id, 
    arweaveTxId, 
    logHash: logHash.substring(0, 10) + '...', // Truncate for readability
    signature: signature.substring(0, 10) + '...', // Truncate for readability
    hasLogFile: !!logFile 
  });
  
  // If in debug mode, just log the operation
  if (DEBUG_MODE) {
    logDebug('Completing task in debug mode', {
      taskId: id,
      arweaveTxId,
      logHash,
      signature,
      hasLogFile: !!logFile
    });
    return;
  }
  
  try {
    // Normal Firebase operation
    const taskRef = doc(tasksCollection, id);
    
    // Upload log file if provided
    if (logFile) {
      logInfo('Uploading log file to storage', { taskId: id, fileName: `logs/${id}.bin`, fileSize: logFile.size });
      const storageRef = ref(storage, `logs/${id}.bin`);
      await uploadBytes(storageRef, logFile);
      logInfo('Log file uploaded successfully', { taskId: id });
    }
    
    logInfo('Updating task status to completed in Firestore', { taskId: id });
    await updateDoc(taskRef, {
      arweaveTxId,
      logHash,
      signature,
      status: 'completed',
      completedAt: Date.now()
    });
    logBlockchain('Task completed successfully', { taskId: id });
  } catch (error) {
    logError('Failed to complete task', { error, taskId: id });
    throw error;
  }
}

// Update a task when verified
export async function verifyTask(
  id: string, 
  verificationResult: boolean, 
  verificationReportHash: string
): Promise<void> {
  logBlockchain('Verifying task', { 
    taskId: id, 
    verificationResult, 
    verificationReportHash: verificationReportHash.substring(0, 10) + '...' // Truncate for readability
  });
  
  // If in debug mode, just log the operation
  if (DEBUG_MODE) {
    logDebug('Verifying task in debug mode', {
      taskId: id,
      verificationResult,
      verificationReportHash
    });
    return;
  }
  
  try {
    // Normal Firebase operation
    const taskRef = doc(tasksCollection, id);
    logInfo('Updating task verification status in Firestore', { 
      taskId: id, 
      verificationResult 
    });
    
    const updateData: any = {
      verificationResult,
      verificationReportHash,
      status: 'verified',
      verifiedAt: Date.now()
    };
    
    await updateDoc(taskRef, updateData);
    
    logBlockchain('Task verified successfully', { 
      taskId: id, 
      verificationResult 
    });
  } catch (error) {
    logError('Failed to verify task', { error, taskId: id });
    throw error;
  }
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
