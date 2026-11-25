# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).
# SkillSwap Platform

## How to Run Locally

### 1. Server Setup (Backend)
```bash
cd server
npm install
cp .env.example .env
# Fill in your MongoDB URI, JWT Secret, Google Client ID, and SMTP credentials in .env
node src/seed.js
npm run dev
cd client
npm install
cp .env.example .env
# Fill in VITE_API_URL and VITE_GOOGLE_CLIENT_ID in .env
npm run dev
