import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyBhYMiG1x6AkvMGVnmeQpeGZrd-acgqE7Q',
  authDomain: 'randevu-3e681.firebaseapp.com',
  projectId: 'randevu-3e681',
  storageBucket: 'randevu-3e681.firebasestorage.app',
  messagingSenderId: '984299042755',
  appId: '1:984299042755:web:c789dc4536379bcacd2f76',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
