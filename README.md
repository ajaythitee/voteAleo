<p align="center">
  <img src="https://img.shields.io/badge/Aleo-Blockchain-blue?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTV6Ii8+PC9zdmc+" alt="Aleo"/>
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/TailwindCSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css" alt="TailwindCSS"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License"/>
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square" alt="PRs Welcome"/>
  <img src="https://img.shields.io/badge/Status-Phase%201%20Active-success?style=flat-square" alt="Status"/>
  <img src="https://img.shields.io/badge/Network-Testnet-yellow?style=flat-square" alt="Network"/>
</p>

<h1 align="center">🗳️ VoteAleo</h1>

<p align="center">
  <strong>Privacy-Preserving Voting Platform on Aleo Blockchain</strong>
</p>

<p align="center">
  Create campaigns, cast anonymous votes, and participate in decentralized governance<br/>
  with complete privacy using Aleo's zero-knowledge proofs.
</p>

---

## ✨ Features

| Feature | Description | Status |
|---------|-------------|--------|
| 🔐 **Anonymous Voting** | Zero-knowledge proofs ensure complete vote privacy | ✅ Phase 1 |
| ⚡ **Gasless Voting** | Relayer pays transaction fees for voters | ✅ Phase 1 |
| 📝 **Campaign Creation** | Create voting campaigns with custom options | ✅ Phase 1 |
| 👛 **Multi-Wallet Support** | Leo Wallet & Puzzle Wallet integration | ✅ Phase 1 |
| 🖼️ **IPFS Storage** | Decentralized storage via Pinata | ✅ Phase 1 |
| 🎨 **Glassmorphism UI** | Modern, sleek design with smooth animations | ✅ Phase 1 |

---

## 🗺️ Development Roadmap

### 🟢 Phase 1: Core Features (Current)

> **Status:** ✅ In Development

The foundation of VoteAleo with essential voting functionality.

| Feature | Description | Status |
|---------|-------------|--------|
| Campaign Creation | Create campaigns with title, description, voting period | ✅ |
| Aleo Wallet Integration | Connect Leo/Puzzle wallet for authentication | ✅ |
| Gasless Voting | Vote without paying gas fees | ✅ |
| Anonymous Voting | zk-SNARKs protected vote privacy | ✅ |
| Vote Tallying | Secure counting with hidden results | ✅ |
| IPFS Storage | Decentralized campaign data storage | ✅ |

---

### 🔵 Phase 2: Enhanced Features

> **Status:** 📅 Planned

Intelligence and analytics features.

| Feature | Description |
|---------|-------------|
| 🤖 AI-Enhanced Options | AI-generated voting suggestions |
| 📊 Campaign Analytics | Voter insights with privacy |
| 📋 Whitelisted Voting | Restrict to verified participants |
| 🔢 Ranked-Choice Voting | Support for ranked preferences |
| 💬 Commenting System | Anonymous feedback with votes |
| 🔒 Hidden Results | Results revealed only after voting ends |

---

### 🟣 Phase 3: Advanced Features

> **Status:** 📅 Planned

Global expansion and governance integration.

| Feature | Description |
|---------|-------------|
| 🌍 Multi-Language Support | Global accessibility |
| 🔄 Conditional Voting | Dynamic proposals based on outcomes |
| 📡 Oracle Integration | Real-world data feeds |
| 🏛️ DAO Governance | Automatic on-chain governance actions |
| 🔐 Private Campaigns | End-to-end encrypted voting |
| ✅ Post-Vote Accountability | Prove participation without revealing vote |
| 🎮 Gamification | Rewards for participation |

---

### 🟠 Phase 4: Future Expansion

> **Status:** 📅 Planned

Scaling and cross-chain capabilities.

| Feature | Description |
|---------|-------------|
| 🌐 Cross-Chain Voting | Vote from Ethereum, Solana, etc. |
| 🛡️ Fraud Detection | Enhanced anti-tampering mechanisms |
| 📈 Comprehensive Reports | Detailed analytics & AI insights |
| ⭐ Reputation System | Earn trust and governance rights |
| 🚀 Scalability | Optimized for large-scale elections |

---

## 🛠️ Tech Stack

<table>
<tr>
<td align="center"><strong>Frontend</strong></td>
<td align="center"><strong>Blockchain</strong></td>
<td align="center"><strong>Storage</strong></td>
<td align="center"><strong>Wallets</strong></td>
</tr>
<tr>
<td>

- Next.js 15
- TypeScript
- TailwindCSS 4
- Framer Motion
- Zustand

</td>
<td>

- Aleo Network
- Leo Language
- zk-SNARKs
- Smart Contracts

</td>
<td>

- Pinata IPFS
- Decentralized
- Campaign Data

</td>
<td>

- Leo Wallet
- Puzzle Wallet
- Multi-Wallet

</td>
</tr>
</table>

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Leo CLI (for contract deployment)
- Leo Wallet or Puzzle Wallet browser extension

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/votealeo.git
cd votealeo

# Install frontend dependencies
cd frontend
npm install --legacy-peer-deps

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

### Environment Variables

Create a `.env.local` file in the frontend directory:

```env
# Pinata IPFS Configuration
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt_token
NEXT_PUBLIC_PINATA_GATEWAY=your_gateway.mypinata.cloud

# Aleo Network Configuration
NEXT_PUBLIC_ALEO_NETWORK=testnet
NEXT_PUBLIC_ALEO_RPC_URL=https://api.explorer.provable.com/v1

# Voting Contract Program ID
NEXT_PUBLIC_VOTING_PROGRAM_ID=voting_votealeo_1234.aleo
```

---

## 📜 Smart Contract Deployment

### Build the Contract

```bash
cd contracts/voting_votealeo
leo build
```

### Deploy to Testnet

```bash
# Using the deployment script
cd contracts
./deploy.sh

# Or manually
leo deploy \
  --private-key YOUR_PRIVATE_KEY \
  --network testnet \
  --endpoint https://api.explorer.provable.com/v1 \
  --broadcast \
  --yes
```

---

## 📁 Project Structure

```
votealeo/
├── 📁 contracts/
│   ├── 📁 voting_votealeo/
│   │   ├── 📁 src/
│   │   │   └── main.leo          # Voting smart contract
│   │   └── program.json          # Leo project config
│   └── deploy.sh                 # Deployment script
│
├── 📁 frontend/
│   ├── 📁 src/
│   │   ├── 📁 app/               # Next.js app router pages
│   │   │   ├── page.tsx          # Home page with roadmap
│   │   │   ├── 📁 campaigns/     # Campaign listing
│   │   │   ├── 📁 campaign/[id]/ # Campaign detail & voting
│   │   │   └── 📁 create/        # Create campaign
│   │   │
│   │   ├── 📁 components/
│   │   │   ├── 📁 ui/            # Glassmorphism components
│   │   │   ├── 📁 layout/        # Header, Footer
│   │   │   └── 📁 wallet/        # Wallet connection
│   │   │
│   │   ├── 📁 services/          # API services
│   │   │   ├── aleo.ts           # Aleo contract interactions
│   │   │   ├── pinata.ts         # IPFS storage
│   │   │   └── wallet.ts         # Wallet management
│   │   │
│   │   ├── 📁 stores/            # Zustand state management
│   │   └── 📁 types/             # TypeScript definitions
│   │
│   ├── .env.example              # Environment template
│   └── package.json
│
├── requirement.txt               # Project requirements
├── developer.md                  # Developer documentation
├── userpreospective.md          # User perspective
├── mistakes.md                   # Common mistakes to avoid
└── README.md                     # This file
```

---

## 🎨 UI Components

VoteAleo features a modern **Glassmorphism** design with:

- 🪟 **Frosted Glass Effects** - Translucent cards and modals
- ✨ **Smooth Animations** - Framer Motion transitions
- 🌈 **Gradient Backgrounds** - Aurora-style backgrounds
- 📱 **Responsive Design** - Mobile-first approach
- 🎯 **Neumorphism** - Soft UI elements for inputs

---

## 🔐 Security Features

| Feature | Implementation |
|---------|----------------|
| **Vote Privacy** | zk-SNARKs ensure votes cannot be traced |
| **Tamper-Proof** | Blockchain immutability |
| **No Double Voting** | On-chain verification |
| **Anonymous Auth** | Wallet-based authentication |

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Links

<p align="center">
  <a href="https://aleo.org">
    <img src="https://img.shields.io/badge/Aleo-Website-blue?style=for-the-badge" alt="Aleo"/>
  </a>
  <a href="https://developer.aleo.org">
    <img src="https://img.shields.io/badge/Aleo-Docs-green?style=for-the-badge" alt="Docs"/>
  </a>
  <a href="https://leo.app">
    <img src="https://img.shields.io/badge/Leo-Wallet-purple?style=for-the-badge" alt="Leo Wallet"/>
  </a>
  <a href="https://puzzle.online">
    <img src="https://img.shields.io/badge/Puzzle-Wallet-indigo?style=for-the-badge" alt="Puzzle Wallet"/>
  </a>
</p>

---

<p align="center">
  Made with ❤️ for the Aleo ecosystem
</p>

<p align="center">
  <sub>Built on Aleo - The Privacy-First Blockchain</sub>
</p>
