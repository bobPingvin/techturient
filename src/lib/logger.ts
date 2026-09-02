import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function logAction(
  username: string,
  action: string,
  description: string,
  extra?: { campaignId?: string; applicantId?: string; details?: string }
) {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      username: username || 'nekpriem',
      action,
      description,
      timestamp: Date.now(),
      campaignId: extra?.campaignId || null,
      applicantId: extra?.applicantId || null,
      details: extra?.details || null,
    });
  } catch (err) {
    console.error('Failed to log audit action:', err);
  }
}
