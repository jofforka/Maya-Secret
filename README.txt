MAYA'S SECRET — MASTER WEBSITE BUILD
====================================

This is the single authoritative project version.

HOW TO UPDATE YOUR CURRENT WEBSITE
----------------------------------
1. Back up your existing website folder.
2. Delete the old website files from the hosting folder.
3. Upload EVERYTHING inside this master folder, preserving the structure:
   - index.html
   - shop.html
   - training.html
   - contact.html
   - admin.html
   - assets/
   - css/
   - js/
4. Do not mix these files with files from earlier Maya's Secret ZIP versions.
5. Open index.html to test the public site.
6. Open admin.html to test product management.

ADMIN PREVIEW LOGIN
-------------------
Temporary passcode: maya2026

CURRENT STORAGE MODEL
---------------------
Products and uploaded images are stored in the browser using localStorage.
Changes made in one browser/device will not automatically appear on another.
Do not clear browser/site data before exporting a catalogue backup from Admin.

CURRENT PAGES
-------------
Home:     index.html
Shop:     shop.html
Training: training.html
Contact:  contact.html
Admin:    admin.html (not shown in public navigation)

CORE FILES
----------
css/styles.css     Shared styling for all pages and Admin
js/catalog.js      Product data and catalogue storage
js/app.js          Public shop, cart and interactive product modal
js/admin.js        Admin product management

NEXT PRODUCTION STEP
--------------------
Replace localStorage and the temporary passcode with Firebase Authentication,
Firestore and Firebase Storage before using the site as a multi-device live store.


SPA PAGE UPDATE
- New file: spa.html
- New script: js/spa.js
- Navigation updated across all public pages.
- Customers can select a spa service, preferred date and time, then send the completed booking request through WhatsApp.
- Service prices are preloaded from the supplied Maya's Secret spa menu.
