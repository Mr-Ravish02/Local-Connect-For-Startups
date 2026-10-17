import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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

const SAMPLE_PRODUCTS = [
  // Denim Jacket - available at 3 shops
  {
    id: 'prod-denim-jacket-1',
    name: 'Denim Jacket',
    price: 1499,
    category: 'Clothing',
    stockStatus: 'in_stock',
    inStock: true,
    shopId: 'sample-shop-1', // Punjab Style Boutique (Clock Tower)
    imageUrl: '/products/denim-jacket.jpg',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-denim-jacket-2',
    name: 'Denim Jacket',
    price: 1299,
    category: 'Clothing',
    stockStatus: 'in_stock',
    inStock: true,
    shopId: 'sample-shop-3', // Royal Fashion House (Model Town)
    imageUrl: '/products/denim-jacket.jpg',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-denim-jacket-3',
    name: 'Denim Jacket',
    price: 1650,
    category: 'Clothing',
    stockStatus: 'out_of_stock',
    inStock: false,
    shopId: 'sample-shop-5', // Desi Threads (Ghumar Mandi)
    imageUrl: '/products/denim-jacket.jpg',
    createdAt: new Date().toISOString(),
  },

  // Leather Jacket - available at 2 shops
  {
    id: 'prod-leather-jacket-1',
    name: 'Leather Jacket',
    price: 3499,
    category: 'Clothing',
    stockStatus: 'in_stock',
    inStock: true,
    shopId: 'sample-shop-1', // Punjab Style Boutique
    imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-leather-jacket-2',
    name: 'Leather Jacket',
    price: 3199,
    category: 'Clothing',
    stockStatus: 'in_stock',
    inStock: true,
    shopId: 'sample-shop-3', // Royal Fashion House
    imageUrl: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=600&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },

  // Mountain Cycle - available at 2 shops
  {
    id: 'prod-mountain-cycle-1',
    name: 'Mountain Cycle',
    price: 8499,
    category: 'Cycle',
    stockStatus: 'in_stock',
    inStock: true,
    shopId: 'sample-shop-2', // Ludhiana Cycle Hub (Gill Road)
    imageUrl: '/products/cycle.jpg',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-mountain-cycle-2',
    name: 'Mountain Cycle',
    price: 7999,
    category: 'Cycle',
    stockStatus: 'in_stock',
    inStock: true,
    shopId: 'sample-shop-4', // SpeedWheels Cycling (Ferozepur Road)
    imageUrl: '/products/cycle.jpg',
    createdAt: new Date().toISOString(),
  },

  // Road Cycle - available at 2 shops
  {
    id: 'prod-road-cycle-1',
    name: 'Road Cycle',
    price: 12000,
    category: 'Cycle',
    stockStatus: 'in_stock',
    inStock: true,
    shopId: 'sample-shop-2', // Ludhiana Cycle Hub
    imageUrl: '/products/cycle.jpg',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-road-cycle-2',
    name: 'Road Cycle',
    price: 11500,
    category: 'Cycle',
    stockStatus: 'out_of_stock',
    inStock: false,
    shopId: 'sample-shop-4', // SpeedWheels Cycling
    imageUrl: '/products/cycle.jpg',
    createdAt: new Date().toISOString(),
  },
];

async function seedProducts() {
  console.log('Signing in...');
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log('Authenticated! Seeding sample products...');
  for (const item of SAMPLE_PRODUCTS) {
    const { id, ...data } = item;
    await setDoc(doc(db, 'products', id), data);
    console.log(`✅ Seeded "${data.name}" (₹${data.price}) for shop ${data.shopId}`);
  }
  console.log('🎉 All sample products seeded successfully!');
  process.exit(0);
}

seedProducts().catch((err) => {
  console.error('Error seeding products:', err);
  process.exit(1);
});
