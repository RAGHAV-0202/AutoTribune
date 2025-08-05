# 📰 AutoTribune - NDTV AI News Scraper & Publisher

**AutoTribune** is a powerful automated tool that scrapes news articles from NDTV (via RSS feed or web scraping), rewrites them using Google's Gemini AI to remove copyright risks, generates AI-based contextual images, and publishes them to a Supabase backend.

This project is ideal for building your own custom news platform with unique, AI-transformed content and visuals.

---

## 🚀 Features

- 🔄 Scrapes latest NDTV articles via RSS and direct HTML parsing
- 🤖 Rewrites articles using Google Gemini (Generative AI)
- 🖼️ Generates custom news-style images using Gemini’s image generation API
- ✏️ Rewrites titles to remove copyright risks
- ☁️ Uploads rewritten articles + images to a Supabase database
- ✅ Includes robust error handling, fail-fast mode, and rate limiting

---

## ⚙️ Tech Stack

| Layer        | Tech                          |
| ------------ | ----------------------------- |
| Scraping     | `axios`, `cheerio`, `xml2js`  |
| AI           | `@google/genai` (Gemini API)  |
| Database     | `Supabase`                    |
| Image Upload | `Supabase Storage`            |
| Runtime      | `Node.js`                     |
| Config       | `dotenv`                      |

---

## 📦 Installation

1. **Clone this repo:**

```bash
git clone https://github.com/YOUR_USERNAME/auto-tribune.git
cd auto-tribune
Install dependencies:

bash
Copy
Edit
npm install
Create .env file:

env
Copy
Edit
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ANON_KEY=your_supabase_key
GEMINI_API_KEY=your_gemini_api_key
Run the scraper:

bash
Copy
Edit
node index.js
By default, it processes 15 articles. You can change the count in the main(count) call at the bottom of the script.

📁 File Structure
bash
Copy
Edit
.
├── index.js           # Main logic (scraping, rewriting, publishing)
├── .env               # API keys and credentials
├── package.json       # Project dependencies
├── README.md          # You're reading it
🔍 How It Works
Step-by-step Flow
Fetch Articles:

Tries to load articles via RSS feed.

If RSS fails, falls back to NDTV website scraping using multiple selectors.

Process Each Article:

Fetches full article content using cheerio.

Rewrites the body with Gemini into 400–500 words of factual, neutral content.

Rewrites the title under 10 words for originality.

Generates a high-quality image based on the rewritten summary.

Uploads everything to Supabase (text + image URL).

Logging & Rate Limiting:

Detailed logs for each step.

Auto skips malformed or short articles.

Adds delay between iterations to avoid rate-limiting.

🧠 AI Instructions
Content Rewrite Prompt
"Rewrite the following news article into a factual report of a new news agency in 400–500 words. Focus exclusively on who, what, when, where, and why. Remove opinions and speculation..."

Image Generation Prompt
"Create a realistic news graphic based on the article summary. Avoid text and cartoonish visuals. Use textures and lighting found in real news photos."

🛡️ Error Handling & Reliability
Checks for:

Timeout errors

Network issues

Invalid API keys or missing fields

Automatically skips problematic articles

Gracefully shuts down on SIGINT and SIGTERM

Global exception handling for uncaught errors

🧪 Example Output
Rewritten Title: “Floods Paralyze Mumbai Suburbs”

Generated Image: Uploaded to Supabase and accessible via signed URL

Article Text: 400-500 words, clean and fact-based summary

✅ Requirements
Node.js v18+

Valid Gemini API key (https://makersuite.google.com/)

A Supabase project with:

Supabase Storage bucket named images

Edge Function or REST endpoint /functions/v1/publish-article to store data

📌 Tips
Make sure your Supabase bucket allows public signed URLs.

Always test with fewer articles first using main(3).

Rotate API keys or add retries if using Gemini extensively.

