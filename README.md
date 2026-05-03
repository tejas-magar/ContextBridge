# 🌉 ContextBridge

**Tired of copy-pasting code into ChatGPT one file at a time? Me too.**

ContextBridge is a tool I built to solve the "context wall." It clones any GitHub repo, summarizes the entire thing, and hands you a single, perfectly structured document that makes your AI assistant feel like it's been working on your team for months.

It's fast, it's secure, and best of all—it's **completely free to host** because everyone brings their own API key.

## 🚀 What can it do?

- **💬 Chat with your Code:** Don't just read the summary; talk to it. Ask where the bugs are or where the auth logic lives using the built-in RAG chat.
- **📂 Interactive Explorer:** Ever try to understand a codebase by looking at a giant text file? It's a nightmare. I added a nested file tree so you can actually *see* the project structure.
- **💸 Bring Your Own Key (BYOK):** I designed this to be safe for public deployment. Since users use their own Gemini or OpenAI keys, you don't have to worry about a surprise $5,000 bill.
- **🛡️ Built-in Safety Rails:** I've locked it down. It won't try to clone a 50GB repo or scan your local server files. It's built to be deployed on the public internet without breaking.

## 🛠️ How to run it locally

### 1. Fire up the Backend
```bash
# From the root folder
npm install
npm start
```

### 2. Start the Frontend
```bash
# In a new terminal
cd frontend
npm install
npm run dev
```
Head over to `http://localhost:5173` and you're good to go!

---

## 🔒 A note on Security
I built ContextBridge with a "trust no one" approach for the backend. 
- It kills clones that take too long (15s max).
- It rejects repos with more than 500 files to keep things snappy.
- It doesn't store your API keys; they stay in your browser.

## 🧱 The Stack
I kept it simple and powerful: **Node.js** and **Express** on the back, **React** and **Vite** on the front. Styled with pure **CSS** to keep it lightweight and fast.

---
By **Tejas**
