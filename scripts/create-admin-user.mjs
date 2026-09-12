import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
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

async function createAdminAccount() {
  console.log(`🛡️ Initializing Admin Account setup for: ${ADMIN_EMAIL}...`);
  let userCredential;

  try {
    // Attempt creation directly
    userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Firebase Authentication user created successfully! UID:', userCredential.user.uid);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.log('ℹ️ User already exists in Firebase Auth. Signing in to verify & sync Firestore record...');
      try {
        userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Successfully authenticated existing user credentials.');
      } catch (signInErr) {
        console.error('❌ Could not authenticate existing user with specified password:', signInErr.message);
        throw signInErr;
      }
    } else {
      console.error('❌ Firebase Auth creation error:', err);
      throw err;
    }
  }

  const uid = userCredential.user.uid;

  // Set / update Firestore user document with role: 'admin'
  console.log('📝 Setting Firestore document for UID:', uid, 'with role: "admin"...');
  await setDoc(
    doc(db, 'users', uid),
    {
      email: ADMIN_EMAIL,
      role: 'admin',
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  // Verify Firestore document
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (!userSnap.exists() || userSnap.data().role !== 'admin') {
    throw new Error('Verification failed: User document does not have "admin" role!');
  }

  console.log('🎉 Admin account setup verified successfully:');
  console.log('   - Email:', userSnap.data().email);
  console.log('   - Role:', userSnap.data().role);
  console.log('   - UID:', uid);
}

createAdminAccount()
  .then(() => {
    console.log('\n✅ Done! Admin account is ready.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Failed to setup admin account:', err);
    process.exit(1);
  });
