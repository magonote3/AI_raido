import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
export const firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const DB_NAME = "radio_gemini_db";
const STORE_NAME = "user_shows";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("IndexedDB failed to open:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "title" });
      }
    };
  });

  return dbPromise;
}

function cleanDocId(title: string): string {
  return encodeURIComponent(title).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
}

export async function saveUserShow(show: any, userId?: string): Promise<void> {
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(show);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    if (userId) {
      try {
        const docId = cleanDocId(show.title);
        const docRef = doc(firestoreDb, `users/${userId}/shows/${docId}`);
        await setDoc(docRef, {
          title: show.title || "Untitled Show",
          duration: show.duration || 0,
          summary: show.summary || "",
          date: show.date || new Date().toISOString(),
          host: show.host || "ステラ",
          userId,
          createdAt: new Date().toISOString()
        }, { merge: true });
      } catch (fErr) {
        console.warn("Firestore sync warning on save:", fErr);
      }
    }
  } catch (err) {
    console.error("IndexedDB saveUserShow failed:", err);
  }
}

export async function getUserShows(userId?: string): Promise<any[]> {
  try {
    const db = await getDB();
    const localShows = await new Promise<any[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const shows = request.result || [];
        resolve(shows);
      };
      request.onerror = () => reject(request.error);
    });

    // Sort shows by date descending (newest first)
    localShows.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    });

    return localShows;
  } catch (err) {
    console.error("IndexedDB getUserShows failed:", err);
    return [];
  }
}

export async function deleteUserShow(title: string, userId?: string): Promise<void> {
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(title);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    if (userId) {
      try {
        const docId = cleanDocId(title);
        const docRef = doc(firestoreDb, `users/${userId}/shows/${docId}`);
        await deleteDoc(docRef);
      } catch (fErr) {
        console.warn("Firestore delete warning:", fErr);
      }
    }
  } catch (err) {
    console.error("IndexedDB deleteUserShow failed:", err);
  }
}
