# SakhiSahay (sakhisahay.in)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**SakhiSahay** is a lightweight, high-performance, and privacy-first digital bridge designed to streamline 24/7 access to One Stop Centres (OSCs / Sakhi Kendras) across India. 

One Stop Centres are a crucial initiative established by the Ministry of Women and Child Development (MWCD), Government of India, funded 100% by the **Nirbhaya Fund** under the **Mission Shakti** (Sambal sub-scheme) umbrella. They provide medical aid, police facilitation, temporary shelter, legal aid, and psycho-social counselling under one roof to women and girls facing domestic, economic, or digital violence.

---

## 📖 The Story & Discoverability Gap

### The Crisis & Turning Point
A mother of three made the brave decision to break a 12-year cycle of severe domestic and digital abuse. She was ready to escape but paralyzed by fear. For many survivors in isolation, the thought of walking straight into a police station or court is intimidating. 

In that critical moment of hesitation, her family discovered India’s Sakhi One Stop Centres. It was the safe, intermediate sanctuary she needed to protect her children and safely initiate formal action. Today, she is doing well and safely away from the abuser, thanks to the end-to-end support provided by the OSC.

### The Realization
Despite being a professional software developer, her brother and her family had absolutely no idea this life-saving government infrastructure existed when they were in the thick of the crisis, meaning her family couldn't help her escape earlier due to a complete lack of awareness.

This exposed a critical bottleneck: the physical infrastructure is in place. And while official Mission Shakti web portals and mobile apps exist, they are not consolidated, frictionless, or simple to use in a high-stress crisis. This gap in digital discoverability and simplicity acts as a barrier for women in distress.

To close this gap, **sakhisahay.in** was built—a clean, friction-free portal mapping and simplifying immediate access to these sanctuaries.

---

## 🛠️ Key Features

*   🗺️ **Interactive Map Explorer:** Visually search and route to the nearest One Stop Centre using official coordinate data, with standard Google Maps navigation linkage.
*   🧭 **Guided Help Finder:** A safe, non-linear helper tool. Survivors can select what best describes their situation (medical aid, police protection, legal counsel, child safety, cyber harassment) to get immediate action steps, ready checklists, and local helpline numbers.
*   🔍 **State & District Directories:** Clean, fast, and structured directory search by state/district index, providing direct phone numbers, email addresses, and locations.
*   🔒 **Privacy-First & Secure:** Zero user login required, zero tracking cookies, and client-side geolocation. All location routing is handled inside the browser to guarantee survivor safety under digital surveillance.
*   📱 **Progressive Web App (PWA):** Instantly installable on any iOS, Android, or desktop device, making the platform accessible offline and easy to access in a single tap on the home screen.

---

## 🏗️ Architecture & Tech Stack

This project is organized as a monorepo using **pnpm workspaces**:

| Directory | Package Name | Role | Tech Stack |
|---|---|---|---|
| `artifacts/sakhi-sahay` | `@workspace/sakhi-sahay` | Web Frontend | React, Vite, Leaflet Maps, TailwindCSS, Wouter |
| `artifacts/api-server` | `@workspace/api-server` | Backend API Server | Node.js, Express, TypeScript |
| `lib/db` | `@workspace/db` | Shared database | TypeScript (Compiled JSON assets) |

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   pnpm (v8+)

### Installation
Clone the repository and install all workspace dependencies from the root directory:
```bash
pnpm install
```

### Running Locally
To launch both the Vite development server (frontend) and the Express API server (backend) concurrently:
```bash
pnpm run dev
```
*   **Frontend Web:** `http://localhost:5173`
*   **Backend API:** `http://localhost:5000`

### Building for Production
To bundle the frontend build assets:
```bash
pnpm run build
```

### Verification & Linting
To perform static analysis and typechecking across all workspace modules:
```bash
pnpm run typecheck
```

---

## 🤝 Contributing

Contributions are welcome, especially in improving the discoverability and usability of the platform:

1.  **OSC Directory Updates:** If you notice an incorrect location, outdated phone number, or changed coordinator name, please update the database entry directly in:
    *   [oscs.ts](artifacts/api-server/src/data/oscs.ts)
2.  **Multilingual Support:** We want to translate the Guided Help Finder and landing pages into regional Indian languages (Hindi, Bengali, Telugu, Tamil, Marathi, etc.) to make it accessible to rural communities.
3.  **Performance Improvements:** Enhancing performance for low-bandwidth 3G/4G connections in rural areas.

---

## 📄 License

This project is licensed under the **MIT License** - see the LICENSE file for details. 
*Disclaimer: SakhiSahay is an independent community initiative helping survivors locate government resources and is not officially affiliated with the Ministry of Women and Child Development.*
