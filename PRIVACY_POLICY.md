# PRIVACY POLICY

**Last Updated:** August 21, 2026

Welcome to **CRUVO** (the "App"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and share your information when you use our mobile application and related backend services.

---

## 1. Information We Collect

We collect information directly from you, automatically through your use of the App, and from third-party services.

### A. Information You Provide to Us
- **Account Registration Information**: When you create an account, we collect your **Username**, **Email Address**, **Password**, and **Display Name**.
- **Rider Profile Details**: You may choose to complete a rider profile, providing optional details such as:
  - **Bio** (brief description about yourself)
  - **Phone Number**
  - **Location City**
  - **Motorcycle details** (Make and Model)
  - **Riding Characteristics** (Riding Style: *Adventure, Sport, Touring, Cruise, Commute*; Experience Level: *Beginner, Intermediate, Veteran, Expert*)
  - **Profile Avatar/Photo** (Uploaded image files)
- **Ride Metadata**: Details of rides you schedule or join, including ride names, dates, times, and roles.

### B. Location and Tracking Data (Real-time and Static)
Because CRUVO is a group riding coordination and tracking utility, we collect precise location data:
- **Continuous Real-Time GPS Tracking**: When you participate in an **Active Ride**, CRUVO collects your precise location data (**Latitude**, **Longitude**, **Heading**, and **Speed**) **even when the app is closed or not in use**, ensuring your position remains visible to your squad on the live map if you minimize the app to answer calls, check navigation, or lock your screen.
- **Route and Navigation Paths**: We store start locations, destinations, checkpoints, and complete route polylines.
- **Incident and Stop Flags**: Coordinates, category types (`FUEL`, `FOOD`, `BREAK`, `GENERAL`, `ISSUE`), and details of stops flagged by you or other riders during a trip.

### C. Automatically Collected Data
- **Timestamps**: Timestamps of account creation, profile modifications, ride creations, position updates, and flags.

---

## 2. How We Use Your Information

We use the collected information to deliver and enhance the core ride-sharing experience:
- **Authentication & Security**: To verify user accounts, establish secure sessions, and log you in.
- **Real-Time Group Coordination**: To stream your live position coordinates to other riders in your active squad so they can see your status, heading, and speed on the live map, even when switching between applications.
- **Route calculation**: To query third-party routing agents (TomTom API) to calculate and cache route distances, durations, and maps for your scheduled rides.
- **Roster & Invite Management**: To manage invitations and group notifications.
- **Stop Alerts**: To display user-flagged stops (breaks, fuel, hazard reports) on the active group map.

---

## 3. How Your Information Is Shared

We share information with other users and third-party services to make the App function:

- **With Other Users (Riders)**:
  - Your display name, username, bike make/model, riding style, experience level, and initials are visible to other users.
  - When in an **Active Ride**, your precise real-time coordinates, heading, and speed are visible on the map to all participants of that ride.
  - User-flagged incidents and stops are visible to all ride participants.
- **With Third-Party Service Providers**:
  - **TomTom Developer APIs**: We share start and finish coordinates to calculate routing polyline coordinates, travel duration, and distance metrics. We also share search terms to resolve geographic queries (geocoding & address search).
  - **Database Host & Infrastructure**: Hosted securely on server environments (Render/PostgreSQL).

---

## 4. Data Storage and Security

- **Server-Side Data**: Your user data, profile, ride histories, routes, and active ride positions are stored in a secure relational database.
- **Client-Side Data**: Authentication tokens are kept secure on your mobile device utilizing OS-level secure storage (`expo-secure-store`).
- **Data Minimization**: High-frequency location updates (coordinates broadcasted during active rides) are updated on a last-known position basis to prevent unnecessary accumulation of historic coordinate trails.

---

## 5. Your Choices, Consent Controls and Data Rights

- **Consent Withdrawal (DPDP & GDPR)**: You can revoke location tracking consent at any time directly through the app settings or device settings.
- **Account Modifications**: You can edit your username, email, display name, and vehicle details within the profile settings screen.
- **Permanent Account & Data Erasure**: You can permanently delete your account and all associated personal data directly within the app settings or by emailing `cruvobs@gmail.com`. All records will be erased within 30 days.

---

## 6. Compliance with DPDP Act, 2023 (India) & GDPR (EU)

- **Unbundled Specific Consent**: Sensitive telemetry consent is obtained separately for specific ride tracking purposes only.
- **Designated Grievance Officer (India)**:
  - **Officer / Desk**: Privacy & Grievance Desk, CRUVO Telemetry Engine
  - **Email**: `cruvobs@gmail.com`
  - **Jurisdiction**: New Delhi, Delhi, India
  - **SLA**: Acknowledged within 48 hours, resolved within 30 days.
  - **Escalation**: You may lodge unresolved grievances with the Data Protection Board of India (DPBI).
- **GDPR Rights (EU/EEA)**: Access (Art. 15), Rectification (Art. 16), Erasure (Art. 17), Portability (Art. 20), and Right to lodge a complaint with an EU Supervisory Authority.

---

## 7. Contact Us

If you have any questions or concerns regarding this Privacy Policy, please contact us at:
- **Email**: cruvobs@gmail.com
- **Website**: https://cruvo-web.onrender.com/privacy.html
