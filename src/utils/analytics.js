import {
  doc,
  updateDoc,
  increment,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Returns the ISO string of the beginning of the current week (Monday 00:00:00).
 */
export function getStartOfWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const start = new Date(now.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

/**
 * Record a profile view on a shop.
 * Increments the view counter in Firestore and records a timestamped view event.
 * Uses sessionStorage to prevent rapid refresh inflating stats in a single session.
 */
export async function recordShopView(shopId) {
  if (!shopId) return;

  const sessionKey = `lh_viewed_shop_${shopId}`;
  if (sessionStorage.getItem(sessionKey)) {
    // Already counted for this browser session
    return;
  }
  sessionStorage.setItem(sessionKey, '1');

  try {
    // 1. Attempt to increment weeklyViews and viewCount on the shop doc directly
    const shopRef = doc(db, 'shops', shopId);
    await updateDoc(shopRef, {
      viewCount: increment(1),
      weeklyViews: increment(1),
      lastViewedAt: serverTimestamp(),
    }).catch(() => {
      // If direct doc update is restricted by security rules, continue to collection
    });

    // 2. Add an event to the shopViews collection for historical & weekly aggregations
    await addDoc(collection(db, 'shopViews'), {
      shopId,
      createdAt: new Date().toISOString(),
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Could not record shop view event:', err);
  }
}

/**
 * Record a product view/click when a shopper interacts with or views a product.
 */
export async function recordProductView(productId, shopId) {
  if (!productId) return;

  const sessionKey = `lh_viewed_product_${productId}`;
  if (sessionStorage.getItem(sessionKey)) {
    return;
  }
  sessionStorage.setItem(sessionKey, '1');

  try {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      viewCount: increment(1),
      views: increment(1),
      lastViewedAt: serverTimestamp(),
    }).catch(() => {});

    // Also add event to productViews
    await addDoc(collection(db, 'productViews'), {
      productId,
      shopId: shopId || null,
      createdAt: new Date().toISOString(),
      timestamp: serverTimestamp(),
    }).catch(() => {});
  } catch (err) {
    console.warn('Could not record product view:', err);
  }
}

/**
 * Query profile views for a shop from the start of the current week.
 */
export async function fetchWeeklyShopViews(shopId) {
  if (!shopId) return 0;

  try {
    const startOfWeek = getStartOfWeek();
    const q = query(
      collection(db, 'shopViews'),
      where('shopId', '==', shopId),
      where('createdAt', '>=', startOfWeek)
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch (err) {
    console.warn('Error fetching weekly views:', err);
    return 0;
  }
}
