MAYA’S SECRET v4.1 CLOUD SYNC
================================

BACKEND
Google Apps Script endpoint:
https://script.google.com/macros/s/AKfycbxG_WDwV7ByiPH_pQ28r2phmSXJrZbC-U1LpG5MC_IkM7CZcxE5EAuXJjj9vLD1Q17f/exec

HOW IT WORKS
1. Admin loads the catalogue from Google Drive through Apps Script.
2. Product image uploads are compressed, uploaded to Drive, and saved as shared image URLs.
3. Save, edit, duplicate, delete and JSON import update the same cloud catalogue.
4. Home, Shop and Checkout read that shared catalogue after each page load.
5. data/products.json remains only as an emergency public fallback.
6. Cart contents remain local to each customer device by design.

DEPLOYMENT
1. Replace the complete GitHub repository contents with this package.
2. Commit the changes.
3. Wait for GitHub Pages to finish deploying.
4. Open cloud-test.html first. It should show Connected to Google Drive.
5. Open admin.html and sign in with the temporary passcode: maya2026
6. Use Refresh cloud.
7. Import the most complete JSON backup only if the Drive catalogue is empty or incomplete.
8. Add a small test product from one device.
9. Refresh admin.html and shop.html on another device.

IMPORTANT
- This is Google Apps Script + Google Drive, not Firestore.
- Product data no longer uses browser localStorage.
- Cart data still uses localStorage so each shopper keeps a private bag.
- Do not click Replace cloud with defaults unless you deliberately want to overwrite the cloud catalogue.
- The current visible Admin passcode is not strong API authentication. Keep the admin URL private until write authentication is added.
