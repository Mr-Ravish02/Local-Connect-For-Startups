/**
 * Seed script: Add lat/lng coordinates to existing Firestore shop documents,
 * or create sample shops around Ludhiana, Punjab (~30.9010° N, 75.8573° E).
 *
 * Usage:  node scripts/seed-coordinates.mjs
 *
 * This uses the Firebase client SDK (same config as the app) so no
 * service-account key is needed — but Firestore rules must allow writes.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';

// ── Firebase config (mirrors .env.local) ──
const firebaseConfig = {
  apiKey: 'AIzaSyAw9BBsHEO7AXg1MlQU_Fob_-fXaI2rNMQ',
  authDomain: 'localhive-7666d.firebaseapp.com',
  projectId: 'localhive-7666d',
  storageBucket: 'localhive-7666d.firebasestorage.app',
  messagingSenderId: '185652101348',
  appId: '1:185652101348:web:630a77f1b63d69140cecf1',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── Sample shops around Ludhiana ──
// Centre: 30.9010, 75.8573
// Spread ~1-8 km apart for visible distance sorting
const SAMPLE_SHOPS = [
  {
    id: 'sample-shop-1',
    shopName: 'Punjab Style Boutique',
    category: 'Clothing',
    address: 'Clock Tower, Chaura Bazaar, Ludhiana',
    description: 'Traditional Punjabi clothing with modern styles. Phulkari, suits, and wedding collections.',
    latitude: 30.9120,
    longitude: 75.8540,
  },
  {
    id: 'sample-shop-2',
    shopName: 'Ludhiana Cycle Hub',
    category: 'Cycle',
    address: 'Gill Road, Ludhiana',
    description: 'Premium cycles, accessories, and repair services. Hero, Atlas, and imported brands.',
    latitude: 30.8890,
    longitude: 75.8420,
  },
  {
    id: 'sample-shop-3',
    shopName: 'Royal Fashion House',
    category: 'Clothing',
    address: 'Kipps Market, Model Town, Ludhiana',
    description: 'Designer wear for men and women. Exclusive collections for every occasion.',
    latitude: 30.9200,
    longitude: 75.8700,
  },
  {
    id: 'sample-shop-4',
    shopName: 'SpeedWheels Cycling',
    category: 'Cycle',
    address: 'Ferozepur Road, Ludhiana',
    description: 'Mountain bikes, road cycles, and kids\' bicycles. Expert fitting and service centre.',
    latitude: 30.8750,
    longitude: 75.8650,
  },
  {
    id: 'sample-shop-5',
    shopName: 'Desi Threads',
    category: 'Clothing',
    address: 'Ghumar Mandi, Ludhiana',
    description: 'Affordable ethnic and casual wear. Kurtis, jeans, and accessories under one roof.',
    latitude: 30.9050,
    longitude: 75.8380,
  },
];

async function main() {
  console.log('🔍 Fetching existing shops from Firestore...\n');

  const shopsSnap = await getDocs(collection(db, 'shops'));
  const existingShops = [];
  shopsSnap.forEach((docSnap) => {
    existingShops.push({ id: docSnap.id, ...docSnap.data() });
  });

  console.log(`   Found ${existingShops.length} existing shop(s).\n`);

  // ── Step 1: Update existing shops that lack coordinates ──
  let updated = 0;
  for (const shop of existingShops) {
    if (typeof shop.latitude === 'number' && typeof shop.longitude === 'number') {
      console.log(`   ✓ "${shop.shopName}" already has coordinates (${shop.latitude}, ${shop.longitude})`);
      continue;
    }

    // Assign a location near Ludhiana centre with slight random offset (0.5-3 km)
    const offsetLat = (Math.random() - 0.5) * 0.04;  // ~±2 km
    const offsetLng = (Math.random() - 0.5) * 0.04;
    const lat = parseFloat((30.9010 + offsetLat).toFixed(6));
    const lng = parseFloat((75.8573 + offsetLng).toFixed(6));

    await updateDoc(doc(db, 'shops', shop.id), {
      latitude: lat,
      longitude: lng,
    });

    console.log(`   📍 Updated "${shop.shopName}" → (${lat}, ${lng})`);
    updated++;
  }

  if (updated > 0) {
    console.log(`\n   ✅ Updated ${updated} shop(s) with coordinates.\n`);
  }

  // ── Step 2: Create sample shops if fewer than 3 shops exist ──
  if (existingShops.length < 3) {
    console.log('📦 Creating sample shops around Ludhiana...\n');

    for (const sample of SAMPLE_SHOPS) {
      // Skip if a shop with this ID already exists
      const exists = existingShops.some((s) => s.id === sample.id);
      if (exists) {
        console.log(`   ⏭  "${sample.shopName}" already exists, skipping.`);
        continue;
      }

      const { id, ...data } = sample;
      await setDoc(doc(db, 'shops', id), {
        ...data,
        ownerId: 'seed-script',
        createdAt: new Date().toISOString(),
      });

      console.log(`   🏪 Created "${sample.shopName}" at (${sample.latitude}, ${sample.longitude})`);
    }

    console.log('\n   ✅ Sample shops created.\n');
  } else {
    console.log('   ℹ  3+ shops already exist — skipping sample creation.\n');
  }

  // ── Final summary ──
  const finalSnap = await getDocs(collection(db, 'shops'));
  console.log('── Final shop list ──\n');
  finalSnap.forEach((docSnap) => {
    const d = docSnap.data();
    const coords = typeof d.latitude === 'number'
      ? `(${d.latitude}, ${d.longitude})`
      : '(no coordinates)';
    console.log(`   🏪 ${d.shopName} — ${d.category} — ${coords}`);
  });

  console.log('\n✅ Done! Refresh http://localhost:5173/ to see results.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
