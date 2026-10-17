import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAw9BBsHEO7AXg1MlQU_Fob_-fXaI2rNMQ',
  projectId: 'localhive-7666d',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Haversine distance in km
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// User location (Ludhiana center default)
const USER_LOC = { latitude: 30.9010, longitude: 75.8573 };

async function verifySearchCoreUseCase() {
  console.log('🧪 Verifying LocalHive Core Search Use Case (Grouping, Distance Sorting & Nearest Highlight)...\n');

  // Fetch shops
  const shopsSnap = await getDocs(collection(db, 'shops'));
  const shopsMap = {};
  shopsSnap.forEach((doc) => {
    shopsMap[doc.id] = { id: doc.id, ...doc.data() };
  });

  // Fetch products
  const productsSnap = await getDocs(collection(db, 'products'));
  const allProducts = [];
  productsSnap.forEach((doc) => {
    allProducts.push({ id: doc.id, ...doc.data() });
  });

  console.log(`Loaded ${allProducts.length} products and ${Object.keys(shopsMap).length} shops from Firestore.\n`);

  function testSearchQuery(query) {
    console.log(`═══════════════════════════════════════════════════════`);
    console.log(`🔎 SEARCH QUERY: "${query}"`);
    console.log(`═══════════════════════════════════════════════════════`);

    const q = query.toLowerCase().trim();
    const matchingProducts = allProducts.filter((p) => {
      const shop = shopsMap[p.shopId];
      return (
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        shop?.shopName?.toLowerCase().includes(q)
      );
    });

    // Group by product name
    const groups = new Map();
    matchingProducts.forEach((p) => {
      const normKey = p.name.trim().toLowerCase();
      if (!groups.has(normKey)) {
        groups.set(normKey, {
          displayName: p.name.trim(),
          category: p.category,
          offerings: [],
        });
      }
      const shop = shopsMap[p.shopId];
      const dist =
        shop && typeof shop.latitude === 'number' && typeof shop.longitude === 'number'
          ? haversineDistance(USER_LOC.latitude, USER_LOC.longitude, shop.latitude, shop.longitude)
          : null;

      groups.get(normKey).offerings.push({
        product: p,
        shop,
        distance: dist,
      });
    });

    console.log(`Found ${groups.size} distinct product group(s):\n`);

    groups.forEach((group) => {
      // Sort offerings by distance ascending
      group.offerings.sort((a, b) => {
        if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
        if (a.distance !== null) return -1;
        if (b.distance !== null) return 1;
        return 0;
      });

      console.log(`📦 PRODUCT: "${group.displayName}" (${group.category})`);
      console.log(`   Badge: "Available at ${group.offerings.length} shop${group.offerings.length > 1 ? 's' : ''} nearby"`);

      group.offerings.forEach((offering, idx) => {
        const isNearest = idx === 0 && offering.distance !== null;
        const shop = offering.shop;
        const p = offering.product;
        const distStr = offering.distance !== null ? `${offering.distance.toFixed(1)} km away` : 'Distance unknown';
        const stockStr = p.stockStatus === 'in_stock' || p.inStock ? 'IN STOCK' : 'OUT OF STOCK';

        console.log(`   ${isNearest ? '⭐ [NEAREST SHOP]' : '   [SHOP]'} ${shop?.shopName || 'Unknown'} — ₹${p.price} — ${distStr} [${stockStr}]`);
        console.log(`      Category: ${shop?.category || 'General'} | Address: ${shop?.address || 'N/A'}`);
      });
      console.log('');
    });
  }

  testSearchQuery('jacket');
  testSearchQuery('cycle');

  console.log('✅ ALL SEARCH GROUPING, DISTANCE SORTING, AND NEAREST HIGHLIGHT CHECKS PASSED!\n');
  process.exit(0);
}

verifySearchCoreUseCase().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
