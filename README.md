# SevaBot: Citizen Services Chatbot

**SevaBot** is an intelligent, AI-powered conversational assistant designed to help Indian citizens navigate and understand various government schemes and services (like PMAY, PM-JAY, Atal Pension Yojana, Mudra Loans, etc.). It aims to empower citizens through accessible digital intelligence and smart governance support.

## 🚀 Features

- **AI-Powered Answers**: Leverages Google's latest Gemini models (via `@google/genai`) to provide specific, structured, and empathetic answers to citizen queries.
- **Local Knowledge Base**: Integrates a local database (`schemes.json`) of government schemes to construct an informed context for the AI, ensuring accurate and highly relevant guidance.
- **Interactive Chat Interface**: A modern, responsive chat UI featuring real-time typing indicators, message history, and suggested query chips.
- **Scheme Explorer**: A dedicated modal to browse, search, and explore available government schemes seamlessly.
- **Beautiful UI/UX**: Built with fluid animations using Framer Motion and premium iconography mapped by Lucide React.
- **Fallback Configurations**: Incorporates graceful AI model degradation to ensure high availability and reliability.

## 🛠️ Tech Stack

- **Frontend Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **AI Integration**: Google Generative AI (`@google/genai`)
- **Styling**: Vanilla CSS with modern Glassmorphism aesthetics and CSS variables.
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 📦 Installation & Setup

1. **Clone the repository** (or navigate to the project directory):
   ```bash
   cd citizen-services-chatbot
   ```

2. **Install dependencies**:
   Make sure you have Node.js installed. Then, run:
   ```bash
   npm install
   ```
   *Note: This project uses standard `npm` (package-lock.json is present).*

3. **Environment Setup**:
   Create a `.env` file in the root of the project (you can use `.env.example` as a template if available) and add your Gemini API Key:
   ```env
   VITE_GEMINI_API_KEY=your_google_gemini_api_key_here
   ```
   *You can obtain an API key from Google AI Studio.*

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to the local URL provided in your terminal (typically `http://localhost:5173`).

## 🧠 How the AI Works

The application uses a retrieval-augmented generation (RAG) style approach:
1. It injects a compiled prompt comprising the local `schemes.json` database into the AI context.
2. It accepts user questions and commands the AI to formulate an answer using markdown (bold text, lists) based primarily on the localized knowledge base, while falling back to general knowledge if the exact scheme isn't in the database.
3. SevaBot sequentially evaluates availability amongst several next-generation Gemini models (including standard Flash and Preview builds) to guarantee a response.

## 📁 Project Structure

```text
citizen-services-chatbot/
├── public/                 # Static public assets
├── src/
│   ├── assets/             # Images, SVGs, etc.
│   ├── components/         # Reusable React components (if extracted)
│   ├── data/
│   │   └── schemes.json    # Local Knowledge base of government schemes
│   ├── services/
│   │   └── api.js          # Google Gemini AI connection and query logic
│   ├── App.jsx             # Main Application root and chat UI
│   ├── index.css           # Global styles and theme design tokens
│   └── main.jsx            # React mounting point
├── .env                    # Environment variables (API Keys)
├── package.json            # Project dependencies and operational scripts
└── vite.config.js          # Vite configuration
```

## 🤝 Contribution

This project is positioned toward the **Smart India Hackathon** initiative for digital empowerment. Any pull requests aimed at expanding the local scheme database (`schemes.json`) or creating more inclusive UI/UX accessibility are highly welcome!

## 📄 License

This project was built for educational and digital empowerment purposes. Please review dependencies for respective licenses.
