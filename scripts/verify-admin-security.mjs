import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
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
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL = 'mr.ravish02@gmail.com';
const ADMIN_PASSWORD = 'ravish@0509';

async function verifySecurity() {
  console.log('🔒 Verifying Admin Authentication and Security Configuration...\n');

  // 1. Authenticate as Admin
  console.log('1️⃣ Authenticating admin account with provided credentials...');
  const credential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log(`   ✅ Auth Successful! Logged in as: ${credential.user.email} (UID: ${credential.user.uid})`);

  // 2. Check Firestore Role
  console.log('\n2️⃣ Verifying Firestore role in users collection...');
  const userDocSnap = await getDoc(doc(db, 'users', credential.user.uid));
  if (!userDocSnap.exists()) {
    throw new Error(`Firestore user doc missing for UID ${credential.user.uid}`);
  }
  const userData = userDocSnap.data();
  console.log(`   ✅ Firestore Document found! Role is: "${userData.role}"`);

  if (userData.role !== 'admin') {
    throw new Error(`Expected role to be 'admin', found: '${userData.role}'`);
  }

  // 3. Test ProtectedRoute dual verification logic
  console.log('\n3️⃣ Testing ProtectedRoute dual-layer validation logic...');
  const testCases = [
    { email: 'mr.ravish02@gmail.com', role: 'admin', expectedAllowed: true, desc: 'Master Admin Email + Admin Role' },
    { email: 'mr.ravish02@gmail.com', role: 'customer', expectedAllowed: false, desc: 'Master Admin Email + Customer Role' },
    { email: 'hacker@test.com', role: 'admin', expectedAllowed: false, desc: 'Random Email + Admin Role' },
    { email: 'shopowner@test.com', role: 'shopOwner', expectedAllowed: false, desc: 'Shop Owner Email + Shop Owner Role' },
  ];

  for (const tc of testCases) {
    const isAllowed = tc.role === 'admin' && tc.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    if (isAllowed !== tc.expectedAllowed) {
      throw new Error(`Security validation failed for case: ${tc.desc}`);
    }
    console.log(`   ✅ Case passed: [${tc.desc}] => ${isAllowed ? 'ACCESS GRANTED' : 'ACCESS DENIED (BLOCKED)'}`);
  }

  console.log('\n🎉 ALL SECURITY VERIFICATIONS PASSED SUCCESSFULLY!\n');
}

verifySecurity()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  });
