import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

// Firebase configuration (replace placeholders)
<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyCDme66sAqomkZbYxl4YMt3ACkW3zWkt0U",
    authDomain: "mcq-first-trial.firebaseapp.com",
    projectId: "mcq-first-trial",
    storageBucket: "mcq-first-trial.firebasestorage.app",
    messagingSenderId: "563813208549",
    appId: "1:563813208549:web:0b1e61feeffdf07147df0c",
    measurementId: "G-QCQG0CRVVD"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Google Auth Provider
const provider = new GoogleAuthProvider();

// DOM elements
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const userEmailDisplay = document.getElementById('user-email');
const accessBasicButton = document.getElementById('access-basic-button');
const accessSeeButton = document.getElementById('access-see-button');
const accessKtmButton = document.getElementById('access-ktm-button');

// Sign in with Google
const signInWithGoogle = () => {
    signInWithPopup(auth, provider)
        .then((result) => {
            // User signed in successfully.
            console.log("User signed in:", result.user);
        }).catch((error) => {
            // Handle Errors here.
            console.error("Sign-in error:", error);
            alert("Sign-in failed. Please try again.");
        });
};

// Sign out
const signOutUser = () => {
    signOut(auth).then(() => {
        // Sign-out successful.
        console.log("User signed out");
    }).catch((error) => {
        // An error happened.
        console.error("Sign-out error:", error);
        alert("Sign-out failed.");
    });
};

// Update UI based on auth state
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        loginButton.style.display = 'none';
        logoutButton.style.display = 'block';
        userEmailDisplay.textContent = `Logged in as: ${user.email}`;
    } else {
        // User is signed out
        loginButton.style.display = 'block';
        logoutButton.style.display = 'none';
        userEmailDisplay.textContent = "Logged out";
    }
});

// Request file access
const requestAccess = async (fileName) => {
    if (!auth.currentUser) {
        alert("Please log in first.");
        return;
    }

    try {
        const idToken = await auth.currentUser.getIdToken(true);
        const response = await fetch('/api/generate-cookie', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ requestedFile: fileName })
        });

        if (response.ok) {
            window.location.href = '/' + fileName;
        } else {
            alert("Access Denied. You may not have permission for this file.");
        }
    } catch (error) {
        console.error("Error requesting access:", error);
        alert("An error occurred while requesting access.");
    }
};

// Event listeners
loginButton.addEventListener('click', signInWithGoogle);
logoutButton.addEventListener('click', signOutUser);
accessBasicButton.addEventListener('click', () => requestAccess('basic_mcq.html'));
accessSeeButton.addEventListener('click', () => requestAccess('see_mcq.html'));
accessKtmButton.addEventListener('click', () => requestAccess('ktm_mcq.html'));
