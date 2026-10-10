import { app } from '../contexts/AuthContext';
import { getFirestore, collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getDatabase, ref, set, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';

const db = getFirestore(app);
const rtdb = getDatabase(app);

export type PowerEventType = 'wake' | 'restart' | 'shutdown';
export type PowerEventStatus = 'requested' | 'sent' | 'failed';

export interface PowerEventRecord {
  type: PowerEventType;
  requestedAt: any;
  requestedBy: string;
  source: 'main-web';
  status: PowerEventStatus;
  message: string;
}

export const powerState = {
  /**
   * Records a durable event in Firestore and updates the live RTDB state.
   * Returns the Firestore document ID for future status updates.
   */
  async recordPowerEvent(type: PowerEventType, uid: string, message: string): Promise<string> {
    try {
      // 1. Write to durable Firestore history
      const docRef = await addDoc(collection(db, 'powerEvents'), {
        type,
        requestedAt: serverTimestamp(),
        requestedBy: uid,
        source: 'main-web',
        status: 'requested',
        message
      } as PowerEventRecord);

      // 2. Update lightweight RTDB live state
      await set(ref(rtdb, 'serverPowerState'), {
        desiredAction: type,
        lastAction: type,
        lastActionAt: rtdbServerTimestamp(),
        lastActionBy: uid,
        lastKnownStatus: 'unknown' // Let the server/polling update this when online
      });

      return docRef.id;
    } catch (error) {
      console.error('[powerState] Failed to record power event:', error);
      throw error; // Let the caller handle it
    }
  },

  /**
   * Updates an existing event's status in Firestore (e.g. after API response)
   */
  async updatePowerEventStatus(eventId: string, status: PowerEventStatus, message?: string): Promise<void> {
    try {
      const updates: any = { status };
      if (message) {
        updates.message = message;
      }
      
      const docRef = doc(db, 'powerEvents', eventId);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('[powerState] Failed to update power event status:', error);
      // We don't throw here to avoid interrupting the main flow
    }
  }
};
