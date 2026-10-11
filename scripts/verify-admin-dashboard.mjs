import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAw9BBsHEO7AXg1MlQU_Fob_-fXaI2rNMQ',
  authDomain: 'localhive-7666d.firebaseapp.com',
  projectId: 'localhive-7666d',
  storageBucket: 'localhive-7666d.firebasestorage.app',
  messagingSenderId: '185652101348',
  appId: '1:185652101348:web:630a77f1b63d69140cecf1',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL = 'mr.ravish02@gmail.com';
const ADMIN_PASSWORD = 'ravish@0509';

async function testAdminDashboardPermissions() {
  console.log('🔑 Signing in as admin...');
  const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log(`✅ Logged in as: ${userCredential.user.email} (UID: ${userCredential.user.uid})`);

  console.log('\n📄 Testing Reading own profile document...');
  const myDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
  if (!myDoc.exists()) {
    throw new Error('Self document does not exist!');
  }
  console.log('✅ Own user doc read successfully. Data:', myDoc.data());

  console.log('\n👥 Testing Listing all users in `users` collection...');
  const usersSnap = await getDocs(collection(db, 'users'));
  console.log(`✅ Listed ${usersSnap.size} user(s) successfully!`);

  console.log('\n🏪 Testing Reading `shops` collection...');
  const shopsSnap = await getDocs(collection(db, 'shops'));
  console.log(`✅ Listed ${shopsSnap.size} shop(s) successfully!`);

  console.log('\n📦 Testing Reading `products` collection...');
  const productsSnap = await getDocs(collection(db, 'products'));
  console.log(`✅ Listed ${productsSnap.size} product(s) successfully!`);

  console.log('\n⭐ Testing Reading `reviews` collection...');
  const reviewsSnap = await getDocs(collection(db, 'reviews'));
  console.log(`✅ Listed ${reviewsSnap.size} review(s) successfully!`);

  console.log('\n🎉 ALL ADMIN PERMISSIONS VERIFIED! Admin Dashboard has complete read access without errors.');
}

testAdminDashboardPermissions()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error during test:', err);
    process.exit(1);
  });
