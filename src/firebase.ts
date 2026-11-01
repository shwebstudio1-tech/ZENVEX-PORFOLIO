import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL
} from 'firebase/storage';

import config from '../firebase-applet-config.json';

const app = initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
});
console.log('ZENVEX Firebase Module Loaded [Production Cloud Sync]');

export const db = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, config.firestoreDatabaseId)
  : getFirestore(app);

export const storage = getStorage(app);

// Seed Initial Default Projects into Firestore if Empty
const DEFAULT_PROJECTS = [
  {
    id: '1',
    title: 'Luxe Atelier',
    category: 'E-COMMERCE CONCEPT',
    type_badge: '01 / E-COMMERCE CONCEPT',
    visual_theme: 'project-fashion',
    image_url: '',
    link_url: '#contact',
    description: 'Luxury e-commerce experience built for high-end boutique brands.',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    title: 'NovaTech Solutions',
    category: 'BUSINESS WEBSITE CONCEPT',
    type_badge: '02 / BUSINESS WEBSITE CONCEPT',
    visual_theme: 'project-tech',
    image_url: '',
    link_url: '#contact',
    description: 'Modern corporate platform engineered for tech and AI startups.',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Studio Forma',
    category: 'CREATIVE PORTFOLIO CONCEPT',
    type_badge: '03 / CREATIVE PORTFOLIO CONCEPT',
    visual_theme: 'project-artist',
    image_url: '',
    link_url: '#contact',
    description: 'Immersive design portfolio with motion aesthetics and editorial layouts.',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '4',
    title: 'FitLife Platform',
    category: 'WELLNESS CONCEPT',
    type_badge: '04 / WELLNESS CONCEPT',
    visual_theme: 'project-wellness',
    image_url: '',
    link_url: '#contact',
    description: 'Mobile-first wellness app landing page and subscription portal.',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '5',
    title: 'Northline Estates',
    category: 'REAL ESTATE CONCEPT',
    type_badge: '05 / REAL ESTATE CONCEPT',
    visual_theme: 'project-property',
    image_url: '',
    link_url: '#contact',
    description: 'High-impact real estate showcase with interactive floorplans.',
    is_active: true,
    created_at: new Date().toISOString()
  }
];

const DEFAULT_OFFERS = [
  {
    id: '1',
    title: 'Special Launch Package — 20% OFF Digital Experience Build',
    highlight_badge: 'LIMITED PROMO',
    description: 'Get a complete high-performance website with interactive 3D hero section, mobile responsiveness, and custom CMS integration at 20% off for new clients.',
    discount_tag: '20% OFF',
    cta_text: 'Claim Special Offer ↗',
    cta_link: 'https://wa.me/923710870570?text=Hi%20ZENVEX%2C%20I%27d%20like%20to%20claim%20the%20Special%20Launch%20Package%20Offer.',
    is_active: true,
    created_at: new Date().toISOString()
  }
];

const DEFAULT_SETTINGS: Record<string, string> = {
  hero_h1: "We don't just build websites.\nWe influence your business.",
  hero_lede: 'Your business deserves more than an online presence. We craft meaningful digital experiences that help your brand stand out, reach further, and grow beyond borders.',
  stat_satisfaction: '98',
  stat_delivered: '48',
  stat_roi: '3.4',
  stat_global: '14',
  phone_number: '+92 371 0870570',
  email_address: 'profassersab57@gmail.com',
  whatsapp_link: 'https://wa.me/923710870570?text=Hi%20ZENVEX%2C%20I%27d%20like%20to%20discuss%20a%20project.',
  google_site_verification: '7Bb508Ueg0kMwvSTHErobneh4h-zFmBYaZOpcIrGsss'
};

let seedingPromise: Promise<void> | null = null;

// Seed database on startup if empty
export async function seedFirestoreIfEmpty() {
  if (seedingPromise) return seedingPromise;
  
  seedingPromise = (async () => {
    try {
      console.log('Checking if Firestore needs seeding...');
      const seededDoc = doc(db, 'site_settings', '_is_seeded');
      const seededSnap = await getDoc(seededDoc);
      
      if (seededSnap.exists() && seededSnap.data().value === 'true') {
        console.log('Firestore already seeded.');
        return;
      }

      console.log('Seeding Firestore defaults...');
      // Seed Projects
      for (const p of DEFAULT_PROJECTS) {
        await setDoc(doc(db, 'projects', p.id), p);
      }

      // Seed Offers
      for (const o of DEFAULT_OFFERS) {
        await setDoc(doc(db, 'offers', o.id), o);
      }

      // Seed Settings
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        await setDoc(doc(db, 'site_settings', key), { key, value });
      }

      // Mark as seeded
      await setDoc(seededDoc, { key: '_is_seeded', value: 'true' });
      console.log('Firestore seeded successfully.');
    } catch (err) {
      console.error('Firestore seeding failed:', err);
    }
  })();
  
  return seedingPromise;
}

// ---------------- PROJECTS ----------------
export async function fetchProjects(onlyActive = true) {
  try {
    await seedFirestoreIfEmpty();
    console.log('Fetching projects from Firestore...');
    const projCol = collection(db, 'projects');
    const snap = await getDocs(projCol);
    const items: any[] = [];
    snap.forEach(d => {
      items.push({ id: d.id, ...d.data() });
    });
    console.log(`Fetched ${items.length} projects.`);

    // Sort by id / created_at descending
    items.sort((a, b) => {
      if (a.created_at && b.created_at) return b.created_at.localeCompare(a.created_at);
      return Number(b.id || 0) - Number(a.id || 0);
    });

    if (onlyActive) {
      return items.filter(i => i.is_active === true || i.is_active === 1);
    }
    return items;
  } catch (err) {
    console.error('Error fetching projects:', err);
    throw err;
  }
}

export async function addProject(data: any) {
  const projCol = collection(db, 'projects');
  const newDoc = {
    title: String(data.title || '').trim(),
    category: String(data.category || 'CONCEPT PROJECT').trim(),
    type_badge: String(data.type_badge || data.category || 'CONCEPT').trim(),
    visual_theme: String(data.visual_theme || 'project-tech').trim(),
    image_url: String(data.image_url || '').trim(),
    link_url: String(data.link_url || '#contact').trim(),
    description: String(data.description || '').trim(),
    is_active: true,
    created_at: new Date().toISOString()
  };
  console.log('Adding project to Firestore:', newDoc);
  const docRef = await addDoc(projCol, newDoc);
  return { id: docRef.id, ...newDoc };
}

export async function updateProject(id: string, data: any) {
  const docRef = doc(db, 'projects', String(id));
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = String(data.title);
  if (data.category !== undefined) updateData.category = String(data.category);
  if (data.type_badge !== undefined) updateData.type_badge = String(data.type_badge);
  if (data.visual_theme !== undefined) updateData.visual_theme = String(data.visual_theme);
  if (data.image_url !== undefined) updateData.image_url = String(data.image_url);
  if (data.link_url !== undefined) updateData.link_url = String(data.link_url);
  if (data.description !== undefined) updateData.description = String(data.description);
  console.log('Updating project in Firestore:', id, updateData);
  await updateDoc(docRef, updateData);
}

export async function toggleProject(id: string) {
  const docRef = doc(db, 'projects', String(id));
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const current = docSnap.data().is_active;
    await updateDoc(docRef, { is_active: !current });
  }
}

export async function deleteProject(id: string) {
  const docRef = doc(db, 'projects', String(id));
  await deleteDoc(docRef);
}

// ---------------- OFFERS ----------------
export async function fetchOffers(onlyActive = true) {
  await seedFirestoreIfEmpty();
  const offerCol = collection(db, 'offers');
  const snap = await getDocs(offerCol);
  const items: any[] = [];
  snap.forEach(d => {
    items.push({ id: d.id, ...d.data() });
  });

  if (onlyActive) {
    return items.filter(i => i.is_active === true || i.is_active === 1);
  }
  return items;
}

export async function addOffer(data: any) {
  const offerCol = collection(db, 'offers');
  const newDoc = {
    title: String(data.title || '').trim(),
    highlight_badge: String(data.highlight_badge || 'SPECIAL OFFER').trim(),
    description: String(data.description || '').trim(),
    discount_tag: String(data.discount_tag || '').trim(),
    cta_text: String(data.cta_text || 'Claim Offer ↗').trim(),
    cta_link: String(data.cta_link || '#contact').trim(),
    is_active: true,
    created_at: new Date().toISOString()
  };
  const docRef = await addDoc(offerCol, newDoc);
  return { id: docRef.id, ...newDoc };
}

export async function toggleOffer(id: string) {
  const docRef = doc(db, 'offers', String(id));
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const current = docSnap.data().is_active;
    await updateDoc(docRef, { is_active: !current });
  }
}

export async function deleteOffer(id: string) {
  const docRef = doc(db, 'offers', String(id));
  await deleteDoc(docRef);
}

// ---------------- SITE SETTINGS ----------------
export async function fetchSiteSettings() {
  await seedFirestoreIfEmpty();
  const setCol = collection(db, 'site_settings');
  const snap = await getDocs(setCol);
  const map: Record<string, string> = {};
  snap.forEach(d => {
    const data = d.data();
    map[data.key || d.id] = data.value;
  });
  return map;
}

export async function saveSiteSettings(settings: Record<string, string>) {
  for (const [key, value] of Object.entries(settings)) {
    await setDoc(doc(db, 'site_settings', key), { key, value: String(value) });
  }
}

// ---------------- REVIEWS ----------------
export async function fetchReviews(onlyApproved = false) {
  const revCol = collection(db, 'reviews');
  const snap = await getDocs(revCol);
  const items: any[] = [];
  snap.forEach(d => {
    items.push({ id: d.id, ...d.data() });
  });

  if (onlyApproved) {
    return items.filter(i => i.approved === true || i.approved === 1);
  }
  return items;
}

export async function addReview(data: any) {
  const revCol = collection(db, 'reviews');
  const newDoc = {
    name: String(data.name || '').trim(),
    company: String(data.company || '').trim(),
    rating: parseInt(data.rating, 10) || 5,
    message: String(data.message || '').trim(),
    approved: false,
    created_at: new Date().toISOString()
  };
  await addDoc(revCol, newDoc);
}

export async function reviewAction(id: string, action: 'approve' | 'reject' | 'delete') {
  const docRef = doc(db, 'reviews', String(id));
  if (action === 'delete') {
    await deleteDoc(docRef);
  } else if (action === 'approve') {
    await updateDoc(docRef, { approved: true });
  } else if (action === 'reject') {
    await updateDoc(docRef, { approved: false });
  }
}

// ---------------- MESSAGES ----------------
export async function fetchMessages() {
  const msgCol = collection(db, 'messages');
  const snap = await getDocs(msgCol);
  const items: any[] = [];
  snap.forEach(d => {
    items.push({ id: d.id, ...d.data() });
  });
  return items;
}

export async function addMessage(data: any) {
  const msgCol = collection(db, 'messages');
  const newDoc = {
    name: String(data.name || '').trim(),
    email: String(data.email || '').trim(),
    project_type: String(data.project || data.project_type || '').trim(),
    details: String(data.details || '').trim(),
    created_at: new Date().toISOString()
  };
  await addDoc(msgCol, newDoc);
}

// ---------------- STORAGE / UPLOADS ----------------
export async function uploadImageToFirebase(dataUrl: string, filename: string): Promise<string> {
  console.log('Uploading image to Firebase Storage...');
  const sanitizedName = String(filename || 'image').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  const storageRef = ref(storage, `portfolio/${Date.now()}_${sanitizedName}`);
  
  // uploadString handles data_url format automatically
  await uploadString(storageRef, dataUrl, 'data_url');
  const downloadUrl = await getDownloadURL(storageRef);
  console.log('Image uploaded successfully:', downloadUrl);
  return downloadUrl;
}
