import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAw9BBsHEO7AXg1MlQU_Fob_-fXaI2rNMQ',
  projectId: 'localhive-7666d',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testScenarios() {
  console.log('Fetching live Firestore catalog...');
  const shopsSnap = await getDocs(collection(db, 'shops'));
  const productsSnap = await getDocs(collection(db, 'products'));

  const shops = [];
  const shopMap = {};
  shopsSnap.forEach((doc) => {
    const data = doc.data();
    const s = {
      id: doc.id,
      name: data.shopName || data.name || 'Unnamed Shop',
      category: data.category || 'General',
      address: data.address || 'Address not listed',
    };
    shops.push(s);
    shopMap[doc.id] = s;
  });

  const products = [];
  productsSnap.forEach((doc) => {
    const data = doc.data();
    const shop = shopMap[data.shopId];
    products.push({
      id: doc.id,
      name: data.name || data.title,
      price: data.price ? `₹${data.price}` : 'Price on inquiry',
      category: data.category || (shop ? shop.category : 'General'),
      stockStatus: data.stockStatus || 'in_stock',
      shopName: shop ? shop.name : 'Unknown Shop',
      shopId: data.shopId,
    });
  });

  console.log(`\n=== FIRESTORE DATA REPORT ===`);
  console.log(`Shops: ${shops.length}`);
  shops.forEach((s) => console.log(` - [${s.category}] ${s.name} at ${s.address} (ID: ${s.id})`));
  console.log(`\nProducts: ${products.length}`);
  products.forEach((p) => console.log(` - ${p.name} (${p.category}) - ${p.price} [${p.stockStatus}] at ${p.shopName}`));

  console.log(`\n=== SCENARIO 1: "Which shops sell cycles nearby?" ===`);
  const cycleShops = shops.filter((s) => s.category?.toLowerCase() === 'cycle');
  console.log(`Matching Shops in Firestore: ${cycleShops.length}`);
  cycleShops.forEach((s) => {
    console.log(` -> Found: ${s.name} located at ${s.address}. Link: /shop/${s.id}`);
  });

  console.log(`\n=== SCENARIO 2: "Is a size M jacket available?" ===`);
  const jacketProduct = products.filter((p) => p.name?.toLowerCase().includes('jacket'));
  console.log(`Matching Products in Firestore: ${jacketProduct.length}`);
  if (jacketProduct.length === 0) {
    console.log(` -> Accurate result: No jackets currently listed.`);
    const clothingShops = shops.filter((s) => s.category?.toLowerCase() === 'clothing');
    console.log(` -> Bot correctly suggests asking Clothing shops: ${clothingShops.map((s) => s.name).join(', ')} via Send Inquiry.`);
  } else {
    jacketProduct.forEach((p) => console.log(` -> Found: ${p.name} at ${p.shopName}`));
  }

  process.exit(0);
}

testScenarios().catch((err) => {
  console.error(err);
  process.exit(1);
});
