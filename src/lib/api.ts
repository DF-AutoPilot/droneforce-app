import { db, storage } from './firebase';
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

// Create a new task
export async function createTask(task: Omit<Task, 'createdAt' | 'status'>) {
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
  const q = query(tasksCollection, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as Task);
}

// Get tasks by creator
export async function getTasksByCreator(creator: string): Promise<Task[]> {
  const q = query(tasksCollection, where('creator', '==', creator), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as Task);
}

// Get tasks by operator
export async function getTasksByOperator(operator: string): Promise<Task[]> {
  const q = query(tasksCollection, where('operator', '==', operator), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as Task);
}

// Get a task by ID
export async function getTaskById(id: string): Promise<Task | null> {
  const taskRef = doc(tasksCollection, id);
  const taskDoc = await getDoc(taskRef);
  
  if (taskDoc.exists()) {
    return taskDoc.data() as Task;
  }
  
  return null;
}

// Update a task when accepted
export async function acceptTask(id: string, operator: string): Promise<void> {
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
  try {
    const storageRef = ref(storage, `logs/${id}.bin`);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error) {
    console.error('Error getting task log URL:', error);
    return null;
  }
}
