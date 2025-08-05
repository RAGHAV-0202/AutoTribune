# 📰 AutoTribune - AI News Scraper & Publisher

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
- git clone https://github.com/RAGHAV-0202/AutoTribune.git
- cd auto-tribune

2.Install dependencies:
- npm install

3. Create .env file:
- SUPABASE_URL=your_supabase_url
  SUPABASE_SERVICE_ANON_KEY=your_supabase_key
  GEMINI_API_KEY=your_gemini_api_key

4. Run the scraper:


## Step-by-step Flow
1. Fetch Articles:
 - Tries to load articles via RSS feed.
 - If RSS fails, falls back to NDTV website scraping using multiple selectors.

2. Process Each Article:
 - Fetches full article content using cheerio.
 - Rewrites the body with Gemini into 400–500 words of factual, neutral content.
 - Rewrites the title under 10 words for originality.
 - Generates a high-quality image based on the rewritten summary.
 - Uploads everything to Supabase (text + image URL).

3. Logging & Rate Limiting:
 - Detailed logs for each step.
 - Auto skips malformed or short articles.
 - Adds delay between iterations to avoid rate-limiting.

## Output
    const output = {
      text : summary ,
      title : newTitle ,
      image : generatedImage
    }
