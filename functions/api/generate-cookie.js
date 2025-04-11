const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');

// Initialize Firebase Admin SDK
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  process.exit(1); // Exit on initialization failure
}

exports.onRequest = async (request, response) => {
  try {
    // Check for POST request
    if (request.method !== 'POST') {
      return response.status(405).send('Method Not Allowed');
    }

    // Extract Firebase ID Token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return response.status(401).send('Unauthorized: Missing or invalid Authorization header');
    }
    const idToken = authHeader.split('Bearer ')[1];

    // Extract requested file from JSON body
    const { requestedFile } = request.body;
    if (!requestedFile) {
      return response.status(400).send('Bad Request: Missing requestedFile in request body');
    }

    // Verify Firebase ID Token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Check Firestore for file permissions
    const firestore = admin.firestore();
    const docRef = firestore.collection('filePermissions').doc(requestedFile);
    const doc = await docRef.get();

    if (!doc.exists) {
      return response.status(403).send('Forbidden: File permission not configured');
    }

    const data = doc.data();
    if (!Array.isArray(data.allowedUsers) || !data.allowedUsers.includes(uid)) {
      return response.status(403).send('Forbidden: User not authorized for this file');
    }

    // Generate JWT
    const payload = { uid: uid, file: requestedFile };
    const jwtSecret = process.env.SHARED_JWT_SECRET;
    const token = jwt.sign(payload, jwtSecret, { expiresIn: '2h' });

    // Set Cookie
    response.setHeader('Set-Cookie', `access_token=${token}; HttpOnly; Secure; Path=/; Max-Age=7200`);
    return response.status(200).send('OK: Cookie set');
  } catch (error) {
    console.error('Error in generate-cookie:', error);
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
        return response.status(401).send('Unauthorized: Invalid or expired token');
    } else if (error.message.includes("invalid json payload")) {
         return response.status(400).send("Bad Request: invalid json")
    }
    return response.status(500).send('Internal Server Error');
  }
};
