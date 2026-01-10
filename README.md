# 🛡️ Financial Fortress v8.1

### *A Service-Oriented Financial Command Center for Strategic Growth*

Financial Fortress is a private, secure, and modular web application built to manage the transition toward a ** Emergency Fund** and track long-term investments. Designed specifically for tracking milestone, it prioritizes data sovereignty through browser-native storage.

---

## 🚀 Key Functional Features

* **Monthly Splitter (Series A Engine):** Dynamically allocates monthly surplus across multiple funds based on percentage ratios (Default: 50/30/20).
* **Safety Fortress Tracker:** A real-time progress visualization towards a goal.
* **Fund Registry:** A customizable master list of investment vehicles (Index Funds, BAF, Gold, etc.).
* **Strategic Timeline:** A milestone tracker for critical financial dates (e.g., SBI FD Maturity on Jan 14th) with urgency indicators.
* **Audit Log:** A detailed deposit history with the ability to correct or delete entries.

---

## 🛠️ Technical Architecture

This application has been refactored from a monolith into a **Service-Oriented Architecture (SOA)** using Alpine.js and the Origin Private File System (OPFS).

### 1. The Service Layer (`app.js`)

Acts as the **Single Source of Truth**.

* **Global Store:** Uses `Alpine.store('fortress')` to manage state across components.
* **Persistence Engine:** Communicates directly with **OPFS** to store data in a secure, origin-locked JSON file.
* **Reactivity:** Automatically recalculates fund breakdowns and progress percentages whenever the history array is modified.

### 2. The Partial View System (`/partials`)

Uses an **Asynchronous Fetch Pattern** to load UI components on demand.

* `calc.html`: Handles the investment logic and fund management.
* `history.html`: Renders the progress bar and transaction audit log.
* `todo.html`: Manages the strategic timeline and urgency logic.

### 3. Storage & Security

* **OPFS (Origin Private File System):** Data is stored in a sandboxed file system on the user's disk. It is faster and more secure than `localStorage`.
* **Persistence Request:** The app requests "Durable Storage" from the browser to prevent auto-deletion of data during disk pressure.
* **Zero-Server Footprint:** No backend database. Your data never leaves your browser.

---

## 📂 Project Structure

```text
/
├── index.html          # The App Shell (Navigation & Status Bar)
├── app.js              # The Global Service (Logic & Storage)
└── partials/           # Modular UI Components
    ├── calc.html       # Investment Splitter
    ├── history.html    # Progress & Audit Log
    └── todo.html       # Financial Timeline

```

---

## 🚦 Getting Started

### Deployment

The app is optimized for **GitHub Pages**.

1. Push the files to your repository.
2. Enable **"Enforce HTTPS"** in GitHub Settings (OPFS requires a Secure Context).
3. Ensure the `/partials` folder is in the root directory.

### Local Development

Since the app uses `fetch()` and `OPFS`, it cannot be run by opening the file directly. Use a local server:

```bash
# Using Python
python -m http.server 8000
# Using Node.js
npx live-server

```

---

## 📝 Roadmap

* [x] Refactor to Modular Service Architecture.
* [x] Implement OPFS File Persistence.
* [x] Add "Correction Mode" (Delete history entries).
* [ ] **Next:** Add "Gold Valuation" calculator.
* [ ] **Next:** Implement automated JSON-to-Email backup reminders.

---

