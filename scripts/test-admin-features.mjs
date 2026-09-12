import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  getDocs,
  getDoc,
  query,
  where,
  deleteDoc,
  doc,
} from 'firebase/firestore';

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

const TEST_SHOP_ID = 'test-admin-shop-' + Date.now();
const TEST_ADMIN_USER_ID = 'test-admin-user-' + Date.now();

async function runAdminVerification() {
  console.log('🛡️  Starting Admin Dashboard Automated Verification...\n');

  // 1. Verify User Role Creation with "admin"
  console.log('1️⃣ Testing user creation with "admin" role...');
  await setDoc(doc(db, 'users', TEST_ADMIN_USER_ID), {
    email: 'admin.tester@localhive.test',
    role: 'admin',
    createdAt: new Date().toISOString(),
  });
  const userSnap = await getDoc(doc(db, 'users', TEST_ADMIN_USER_ID));
  if (!userSnap.exists() || userSnap.data().role !== 'admin') {
    throw new Error('Admin user document verification failed!');
  }
  console.log('   ✅ Admin user document stored and role verified as "admin".');

  // 2. Create a Test Shop
  console.log('\n2️⃣ Creating test shop for admin management...');
  await setDoc(doc(db, 'shops', TEST_SHOP_ID), {
    ownerId: TEST_ADMIN_USER_ID,
    shopName: 'Admin Test Bakery',
    category: 'Bakery & Sweets',
    address: '100 Admin Ave, Downtown',
    phone: '919876543210',
    createdAt: new Date().toISOString(),
  });
  console.log(`   ✅ Test shop created with ID: ${TEST_SHOP_ID}`);

  // 3. Create 2 Products for this shop
  console.log('\n3️⃣ Adding products to test shop...');
  const prod1Ref = await addDoc(collection(db, 'products'), {
    shopId: TEST_SHOP_ID,
    name: 'Sourdough Artisan Loaf',
    category: 'Bakery & Sweets',
    price: 6.5,
    inStock: true,
    createdAt: new Date().toISOString(),
  });
  const prod2Ref = await addDoc(collection(db, 'products'), {
    shopId: TEST_SHOP_ID,
    name: 'Chocolate Croissant',
    category: 'Bakery & Sweets',
    price: 3.75,
    inStock: true,
    createdAt: new Date().toISOString(),
  });
  console.log(`   ✅ Product 1 created: ${prod1Ref.id}`);
  console.log(`   ✅ Product 2 created: ${prod2Ref.id}`);

  // 4. Create a Review for this shop
  console.log('\n4️⃣ Adding a customer review for moderation testing...');
  const revRef = await addDoc(collection(db, 'reviews'), {
    shopId: TEST_SHOP_ID,
    customerId: 'test-cust-456',
    customerEmail: 'shopper@test.com',
    rating: 4,
    comment: 'Delicious sourdough! Highly recommended.',
    createdAt: new Date().toISOString(),
  });
  console.log(`   ✅ Review created: ${revRef.id}`);

  // 5. Test Deleting Single Product (as Admin)
  console.log('\n5️⃣ Testing Admin Delete Single Product (Product 1)...');
  await deleteDoc(doc(db, 'products', prod1Ref.id));
  const checkProd1 = await getDoc(doc(db, 'products', prod1Ref.id));
  if (checkProd1.exists()) {
    throw new Error('Product 1 was not deleted!');
  }
  console.log('   ✅ Product 1 successfully deleted from products collection.');

  // Verify Product 2 is still intact
  const checkProd2 = await getDoc(doc(db, 'products', prod2Ref.id));
  if (!checkProd2.exists()) {
    throw new Error('Product 2 should still exist!');
  }
  console.log('   ✅ Product 2 remains active in products collection.');

  // 6. Test Deleting Single Review (as Admin Moderation)
  console.log('\n6️⃣ Testing Admin Delete Single Review for Moderation...');
  await deleteDoc(doc(db, 'reviews', revRef.id));
  const checkRev = await getDoc(doc(db, 'reviews', revRef.id));
  if (checkRev.exists()) {
    throw new Error('Review was not deleted!');
  }
  console.log('   ✅ Review successfully removed by moderation action.');

  // 7. Test Cascading Shop Deletion (Delete Shop + all associated products)
  console.log('\n7️⃣ Testing Admin Cascade Deletion for Shop (and all its remaining products)...');
  // Replicate AdminDashboard cascade delete logic:
  const pQuery = query(collection(db, 'products'), where('shopId', '==', TEST_SHOP_ID));
  const pSnap = await getDocs(pQuery);
  const deletePromises = [];
  pSnap.forEach((pDoc) => {
    deletePromises.push(deleteDoc(doc(db, 'products', pDoc.id)));
  });
  deletePromises.push(deleteDoc(doc(db, 'shops', TEST_SHOP_ID)));
  await Promise.all(deletePromises);

  // Verify shop document deleted
  const checkShop = await getDoc(doc(db, 'shops', TEST_SHOP_ID));
  if (checkShop.exists()) {
    throw new Error('Shop document was not deleted!');
  }
  console.log('   ✅ Shop document deleted.');

  // Verify all products of this shop are gone
  const verifyProductsSnap = await getDocs(
    query(collection(db, 'products'), where('shopId', '==', TEST_SHOP_ID))
  );
  if (verifyProductsSnap.size > 0) {
    throw new Error(`Expected 0 products for deleted shop, found ${verifyProductsSnap.size}!`);
  }
  console.log('   ✅ All associated products for the shop deleted cleanly (cascade delete verified).');

  // 8. Cleanup test user
  console.log('\n8️⃣ Cleaning up test admin user...');
  await deleteDoc(doc(db, 'users', TEST_ADMIN_USER_ID));
  console.log('   ✅ Test user cleaned up.');

  console.log('\n🎉 ALL ADMIN DASHBOARD TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}

runAdminVerification().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
