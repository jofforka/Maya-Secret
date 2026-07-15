MAYA'S SECRET v4.0 CLOUD EDITION

Cloud backend:
Google Apps Script + Google Drive products.json and uploads folder.

API endpoint is configured in js/cloud.js.

HOW IT WORKS
- Home, Shop and Checkout request the shared cloud catalogue on every visit.
- If the cloud endpoint is temporarily unavailable, the bundled catalogue in js/catalog.js is used as a fallback.
- Admin product saves, edits, deletes, imports and image uploads are written to Google Drive.
- Product changes made on one phone or computer appear on every other device after refresh.

FIRST-TIME MIGRATION
1. Open admin.html and sign in with the temporary passcode maya2026.
2. Click Import backup.
3. Choose the JSON backup containing your largest/most complete product catalogue.
4. Confirm replacement of the cloud catalogue.
5. Wait for the success message.
6. Open shop.html on phone and laptop and refresh.

IMPORTANT SECURITY NOTE
The temporary passcode only hides the Admin interface in the browser. The Apps Script API is publicly reachable because the Shop must read it. Before wider public launch, add an Admin secret/token check to all write actions or use Google sign-in/authentication.

DEPLOYMENT
Upload the complete contents of this folder to the GitHub repository, replacing the previous website files.
