import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyALzXQZ85phA0PyJbOKMvPJ27Cxdl8DtgI",
  authDomain: "strictdom-38f90.firebaseapp.com",
  projectId: "strictdom-38f90",
  storageBucket: "strictdom-38f90.firebasestorage.app",
  messagingSenderId: "410774388183",
  appId: "1:410774388183:web:bddeb41c7c0ccba5679f92"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
