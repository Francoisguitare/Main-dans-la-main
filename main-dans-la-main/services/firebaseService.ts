import { initializeApp } from 'firebase/app';
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    doc, 
    query, 
    orderBy,
    enableIndexedDbPersistence,
    deleteDoc,
} from 'firebase/firestore';
import { NeedCard } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyC408YUZX_ctHyNfcoQ2ERMiycXv-ocPFQ",
  authDomain: "main-dans-la-main-bf7db.firebaseapp.com",
  projectId: "main-dans-la-main-bf7db",
  storageBucket: "main-dans-la-main-bf7db.firebasestorage.app",
  messagingSenderId: "517175459214",
  appId: "1:517175459214:web:21f239832dcc50176e78df"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one.
      // This is a normal scenario.
      console.warn('Firebase persistence failed: multiple tabs open.');
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the
      // features required to enable persistence.
      console.error('Firebase persistence is not available in this browser.');
    }
  });


const needsCollection = collection(db, 'needs');

// --- Needs ---

export const onNeedsUpdate = (callback: (needs: NeedCard[]) => void) => {
    const q = query(needsCollection, orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const needs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as NeedCard));
        callback(needs);
    });
};

export const addNeed = async (need: Omit<NeedCard, 'id'>) => {
    return await addDoc(needsCollection, need);
};

export const updateNeed = async (needId: string, updates: Partial<NeedCard>) => {
    const needDoc = doc(db, 'needs', needId);
    return await updateDoc(needDoc, updates);
};

export const deleteNeed = async (needId: string) => {
    const needDoc = doc(db, 'needs', needId);
    return await deleteDoc(needDoc);
};