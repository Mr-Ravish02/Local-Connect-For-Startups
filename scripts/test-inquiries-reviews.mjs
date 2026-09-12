import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';

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

const TEST_SHOP_ID = 'test-shop-verification-' + Date.now();
const TEST_CUSTOMER_ID = 'test-customer-123';

async function testInquiryAndReview() {
  console.log('🧪 Testing Inquiry and Review Firestore integration...\n');

  // 1. Submit Inquiry
  console.log('1️⃣ Submitting test inquiry to "inquiries" collection...');
  const inquiryData = {
    shopId: TEST_SHOP_ID,
    customerId: TEST_CUSTOMER_ID,
    customerEmail: 'test.shopper@example.com',
    message: 'Hello! Do you have blue denim jackets in size M in stock?',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const inqRef = await addDoc(collection(db, 'inquiries'), inquiryData);
  console.log(`   ✅ Inquiry created with ID: ${inqRef.id}`);

  // Fetch inquiry to verify fields
  const inqQuery = query(collection(db, 'inquiries'), where('shopId', '==', TEST_SHOP_ID));
  const inqSnap = await getDocs(inqQuery);
  console.log(`   Fetched ${inqSnap.size} inquiry document(s) for test shop.`);

  let savedInquiry = null;
  inqSnap.forEach((docSnap) => {
    savedInquiry = docSnap.data();
    console.log('   Retrieved inquiry data:', JSON.stringify(savedInquiry, null, 2));
  });

  if (!savedInquiry || savedInquiry.shopId !== TEST_SHOP_ID || savedInquiry.status !== 'pending' || !savedInquiry.message || !savedInquiry.customerId || !savedInquiry.createdAt) {
    throw new Error('Inquiry verification failed!');
  }

  // 2. Submit Review
  console.log('\n2️⃣ Submitting test review to "reviews" collection...');
  const reviewData = {
    shopId: TEST_SHOP_ID,
    customerId: TEST_CUSTOMER_ID,
    customerEmail: 'test.shopper@example.com',
    rating: 5,
    comment: 'Fantastic shop! High quality clothing and fast response.',
    createdAt: new Date().toISOString(),
  };

  const revRef = await addDoc(collection(db, 'reviews'), reviewData);
  console.log(`   ✅ Review created with ID: ${revRef.id}`);

  // Fetch reviews to verify fields and calculate average
  const revQuery = query(collection(db, 'reviews'), where('shopId', '==', TEST_SHOP_ID));
  const revSnap = await getDocs(revQuery);
  console.log(`   Fetched ${revSnap.size} review document(s) for test shop.`);

  const reviewsList = [];
  revSnap.forEach((docSnap) => {
    reviewsList.push(docSnap.data());
  });

  const sumRating = reviewsList.reduce((acc, r) => acc + r.rating, 0);
  const avgRating = (sumRating / reviewsList.length).toFixed(1);
  console.log(`   Calculated Average Rating: ${avgRating} / 5 stars`);
  console.log('   Retrieved review data:', JSON.stringify(reviewsList[0], null, 2));

  if (reviewsList.length !== 1 || Number(avgRating) !== 5 || !reviewsList[0].comment || !reviewsList[0].rating || !reviewsList[0].createdAt) {
    throw new Error('Review verification failed!');
  }

  // Cleanup test documents
  console.log('\n🧹 Cleaning up test documents...');
  await deleteDoc(doc(db, 'inquiries', inqRef.id));
  await deleteDoc(doc(db, 'reviews', revRef.id));
  console.log('   ✅ Test documents cleaned up.');

  console.log('\n🎉 ALL INQUIRY AND REVIEW TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}

testInquiryAndReview().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
