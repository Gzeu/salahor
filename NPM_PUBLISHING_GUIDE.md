# 📦 NPM Publishing Guide pentru Salahor

## 🎯 **SETUP RAPID - 5 MINUTE PÂNĂ LA NPM!**

### **🔐 1. SETUP NPM ACCOUNT**

#### **Creează cont NPM:**
```bash
# 1. Mergi pe https://www.npmjs.com
# 2. Sign Up cu username, email, password
# 3. Verifică email-ul (IMPORTANT!)
```

#### **Login în terminal:**
```bash
npm login
# Introdu: username, password, email
# Verifică:
npm whoami  # Trebuie să afișeze username-ul tău
```

---

## 🚀 **METODA 1: AUTOMATED (RECOMMENDED) - CHANGESETS**

### **✅ Salahor are déjà Changesets setup!**

#### **📝 Step 1: Create Changeset**
```bash
cd salahor
pnpm changeset

# Răspunde la întrebări:
# ❓ Which packages changed? → Selectează @salahor/core (și altele)
# ❓ What type of change? → minor (pentru features noi)
# ❓ Summary? → "Enhanced NPM publishing setup with latest optimizations"
```

#### **🔄 Step 2: Version & Build**
```bash
# Update versions automat:
pnpm version-packages

# Build toate packages:
pnpm run build

# Test că totul funcționează:
pnpm run test
```

#### **🚀 Step 3: Publish to NPM**
```bash
# Publică toate packages odată:
pnpm release

# SAU folosește scriptul optimizat:
pnpm run publish-all
```

---

## 🔧 **METODA 2: MANUAL PUBLISHING**

### **📦 Pentru control total:**

```bash
# 1. Build & Test:
pnpm run prepare-release

# 2. Publică fiecare package:
cd packages/core
npm publish --access public

cd ../backend-express
npm publish --access public

cd ../backend-fastify 
npm publish --access public

cd ../frontend-react
npm publish --access public

cd ../frontend-vue
npm publish --access public
```

---

## 🤖 **METODA 3: GITHUB ACTIONS (FULLY AUTOMATED)**

### **🔑 Setup NPM Token:**

1. **Creează NPM Access Token:**
   - Mergi pe https://www.npmjs.com/settings/tokens
   - Click "Generate New Token" → "Classic Token"
   - Selectează "Automation" (pentru CI/CD)
   - Copy token-ul generat

2. **Adaugă în GitHub Secrets:**
   - Mergi pe https://github.com/Gzeu/salahor/settings/secrets/actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: (paste token-ul NPM)
   - Click "Add secret"

### **🚀 Auto-Publish via GitHub:**

#### **Opțiunea A - Manual Trigger:**
```bash
# Mergi pe GitHub Actions tab în repo
# Click pe "NPM Publish" workflow
# Click "Run workflow"
# Selectează release type (patch/minor/major)
# Click "Run workflow" verde
```

#### **Opțiunea B - Automatic via Changesets:**
```bash
# Local:
pnpm changeset  # Creează changeset
git add . && git commit -m "chore: add changeset for release"
git push

# GitHub Actions va publica automat!
```

---

## 📊 **VERIFICARE DUPĂ PUBLISHING**

### **✅ Check NPM:**
```bash
# Verifică că package-urile sunt live:
npm view @salahor/core
npm view @salahor/backend-express
npm view @salahor/backend-fastify
npm view @salahor/frontend-react
npm view @salahor/frontend-vue
```

### **🧪 Test Installation:**
```bash
# Test că se poate instala:
mkdir test-install
cd test-install
npm init -y
npm install @salahor/core
node -e "console.log(require('@salahor/core'))"
```

---

## 🎯 **RECOMANDAREA MEA:**

### **🚀 FOLOSEȘTE CHANGESETS (METODA 1):**

1. **Prima dată:**
   ```bash
   npm login
   pnpm changeset
   pnpm version-packages
   pnpm run build
   pnpm release
   ```

2. **Pentru viitor:**
   ```bash
   # Setup GitHub NPM_TOKEN secret
   # Apoi doar:
   pnpm changeset
   git add . && git commit -m "chore: add changeset"
   git push
   # GitHub Actions publică automat! 🤖
   ```

---

## 🎉 **CE SE ÎNTÂMPLĂ DUPĂ:**

### **📦 Packages Available pe NPM:**
- `@salahor/core` - Core functionality  
- `@salahor/backend-express` - Express.js integration
- `@salahor/backend-fastify` - Fastify integration
- `@salahor/frontend-react` - React hooks & utilities
- `@salahor/frontend-vue` - Vue composables & utilities

### **👥 Usage pentru Developers:**
```bash
# Install în projectele lor:
npm install @salahor/core
npm install @salahor/frontend-react

# Use în cod:
import { createEventStream } from '@salahor/core';
```

---

## 🚀 **START PUBLISHING ACUM:**

```bash
# Quick 4-step process:
npm login                    # Login NPM  
pnpm changeset              # Describe ce publici
pnpm version-packages       # Update versions
pnpm build && pnpm release  # Build & publish
```

**🎉 În 5 minute Salahor va fi LIVE pe NPM! 🌍**

**Ready to make Salahor globally available? 🚀**
