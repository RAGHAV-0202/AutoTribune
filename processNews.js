import axios from "axios";
import * as cheerio from "cheerio";
import * as xml2js from "xml2js";
import * as dotenv from "dotenv";
dotenv.config();
import { GoogleGenAI, Modality } from "@google/genai";
import * as fs from "node:fs";
import { createClient } from '@supabase/supabase-js'

// Initialize clients with error handling
let supabase;
let GEMINI_API_KEY;

try {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ANON_KEY) {
    throw new Error("Missing Supabase credentials");
  }
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ANON_KEY);
  GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    console.warn("⚠️ Warning: GEMINI_API_KEY not found. AI features will be disabled.");
  }
} catch (error) {
  console.error("❌ Configuration Error:", error.message);
  process.exit(1);
}

function slugify(text) {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error("Invalid text input for slugify");
    }
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  } catch (error) {
    console.error("❌ Slugify Error:", error.message);
    return 'default-slug';
  }
}

async function scrapeNDTV_RSS(count) {
  try {
    console.log("📡 Fetching RSS feed...");
    const res = await axios.get("https://feeds.feedburner.com/ndtvnews-latest", {
      timeout: 10000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    
    if (!res.data) {
      throw new Error("Empty response from RSS feed");
    }

    const parsed = await xml2js.parseStringPromise(res.data);
    
    if (!parsed?.rss?.channel?.[0]?.item) {
      throw new Error("Invalid RSS structure");
    }

    const items = parsed.rss.channel[0].item;
    const articles = items.slice(0, count)
      .map((item) => {
        try {
          if (!item.title?.[0] || !item.link?.[0]) {
            return null;
          }
          return {
            title: item.title[0],
            link: item.link[0],
          };
        } catch (error) {
          console.warn("⚠️ Skipping malformed RSS item:", error.message);
          return null;
        }
      })
      .filter(Boolean);

    console.log(`✅ Successfully fetched ${articles.length} articles from RSS`);
    return articles;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error("❌ RSS fetch timeout - server took too long to respond");
    } else if (error.code === 'ENOTFOUND') {
      console.error("❌ RSS fetch failed - network/DNS error");
    } else {
      console.error("❌ Error fetching RSS:", error.message);
    }
    return [];
  }
}

async function scrapeNDTV() {
  try {
    console.log("🌐 Scraping NDTV website...");
    const res = await axios.get("https://www.ndtv.com/latest", {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000
    });

    if (!res.data) {
      throw new Error("Empty response from NDTV website");
    }

    const $ = cheerio.load(res.data);
    const selectors = [
      ".new_storylising_content",
      ".storylist_container",
      ".story_list",
      ".lstng_pg_stry",
      ".news_Itm",
      "article",
    ];

    for (const selector of selectors) {
      const articles = [];

      try {
        $(selector).each((_, el) => {
          try {
            let title =
              $(el).find("h2 a").text().trim() ||
              $(el).find("h3 a").text().trim() ||
              $(el).find(".story_title a").text().trim() ||
              $(el).find("a").first().text().trim();

            let link =
              $(el).find("h2 a").attr("href") ||
              $(el).find("h3 a").attr("href") ||
              $(el).find(".story_title a").attr("href") ||
              $(el).find("a").first().attr("href");

            if (link && !link.startsWith("http")) {
              link = `https://www.ndtv.com${link}`;
            }

            if (title && link && title.length > 10) {
              articles.push({ title, link });
            }
          } catch (error) {
            console.warn("⚠️ Error processing article element:", error.message);
          }
        });

        if (articles.length > 0) {
          console.log(`✅ Successfully scraped ${articles.length} articles`);
          return articles.slice(0, 5);
        }
      } catch (error) {
        console.warn(`⚠️ Error with selector "${selector}":`, error.message);
        continue;
      }
    }

    return [];
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error("❌ NDTV scraping timeout");
    } else if (error.code === 'ENOTFOUND') {
      console.error("❌ NDTV scraping failed - network error");
    } else {
      console.error("❌ Error scraping NDTV:", error.message);
    }
    return [];
  }
}

async function getFullArticle(link) {
  try {
    if (!link || typeof link !== 'string') {
      throw new Error("Invalid article link");
    }

    console.log(`📄 Fetching article: ${link.substring(0, 50)}...`);
    const res = await axios.get(link, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 12000
    });

    if (!res.data) {
      throw new Error("Empty article response");
    }

    const $ = cheerio.load(res.data);
    const paragraphs = [];

    const selectors = [
      ".sp-cn.ins_storybody > p",
      ".ins_storybody p",
      ".story_content p",
      ".article-content p",
      ".content p",  
      "p",
    ];

    for (const selector of selectors) {
      try {
        $(selector).each((_, el) => {
          const text = $(el).text().trim();
          if (text.length > 50 && !text.includes("©") && !text.includes("All rights reserved")) {
            paragraphs.push(text);
          }
        });

        if (paragraphs.length > 3) break;
      } catch (error) {
        console.warn(`⚠️ Error with selector "${selector}":`, error.message);
        continue;
      }
    }

    const content = paragraphs.slice(0, 8).join("\n\n");
    
    if (content.length < 100) {
      throw new Error("Article content too short");
    }

    console.log(`✅ Article content extracted (${content.length} chars)`);
    return content;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error("⚠️ Article fetch timeout:", link);
    } else if (error.code === 'ENOTFOUND') {
      console.error("⚠️ Article fetch network error:", link);
    } else {
      console.error("⚠️ Error fetching article:", error.message);
    }
    return "";
  }
}

async function rewriteWithGemini(content) {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key not available - content rewriting required");
  }

  if (!content || content.length < 50) {
    throw new Error("Content too short for rewriting");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const prompt = `**Role:** You are a neutral and objective news editor.
**Task:** Rewrite the following news article into a factual report of a new news agency in 400 words.
**Audience:** A general reader who wants to understand the key facts quickly.
**Instructions:**
1. Focus exclusively on the core facts: who, what, when, where, and why.
2. Remove all opinion, speculation, promotional language, and irrelevant details.
3. Write in a clear, professional, and objective tone.
4. Do not copy sentences verbatim from the original article. Paraphrase everything.
5. Begin with a single sentence that summarizes the most important information.
6. What we are doing is feeding you already present news and your work is to transform into a non copyrightable content for someone else
7. Most Important: make content large 400-500 words

**Article to process:**
"${content}"`;

  try {
    console.log("🤖 Rewriting content with Gemini...");
    const res = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 30000
      }
    );

    if (!res.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("Invalid response structure from Gemini API");
    }

    const rewrittenContent = res.data.candidates[0].content.parts[0].text;
    
    if (rewrittenContent.length < 100) {
      throw new Error("Generated content too short");
    }

    console.log(`✅ Content rewritten successfully (${rewrittenContent.length} chars)`);
    return rewrittenContent;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      throw new Error("Gemini API timeout");
    } else if (error.response?.status === 429) {
      throw new Error("Gemini API rate limit exceeded");
    } else if (error.response?.status === 403) {
      throw new Error("Gemini API authentication failed");
    } else {
      throw new Error(`Gemini API error: ${error.response?.data || error.message}`);
    }
  }
}

async function generateImage(summary, imageName) {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key not available - image generation required");
  }

  if (!summary || summary.length < 50) {
    throw new Error("Summary too short for image generation");
  }

  if (!imageName) {
    throw new Error("Image name is required");
  }

  try {
    console.log(`🎨 Generating image for: ${imageName}`);
    const ai = new GoogleGenAI({});
    const contents = `Create a high-quality, realistic news graphic image for the following article summary. The image should be visually appealing and contextually relevant, using realistic textures, natural lighting, and news-style visuals (not cartoons or abstract). Avoid text in the image.\n\n${summary}`;

    
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents: contents,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    if (!response?.candidates?.[0]?.content?.parts) {
      throw new Error("Invalid image generation response");
    }

    let buffer;
    let imageGenerated = false;

    for (const part of response.candidates[0].content.parts) {
      if (part.text) {
        console.log("📝 Image generation context:", part.text.substring(0, 100) + "...");
      } else if (part.inlineData) {
        try {
          const imageData = part.inlineData.data;
          if (!imageData) {
            throw new Error("No image data received");
          }

          buffer = Buffer.from(imageData, "base64");
          
          // Save locally as backup
          fs.writeFileSync("gemini-native-image.png", buffer);
          console.log("💾 Image saved locally as backup");
          imageGenerated = true;

          async function uploadToSupaBase() {
            try {
              if (!supabase) {
                throw new Error("Supabase client not initialized");
              }

              console.log(`☁️ Uploading image to Supabase: ${imageName}.png`);
              const { data, error } = await supabase.storage
                .from('images')
                .upload(`${imageName}.png`, buffer, {
                  contentType: 'image/png',
                  upsert: true,
                });
              
              if (error) {
                throw new Error(`Supabase upload failed: ${error.message}`);
              }

              // Create signed URL with long expiry
              const { data: signedUrlData, error: urlError } = await supabase.storage
                .from("images")
                .createSignedUrl(`${imageName}.png`, 2147483647);

              if (urlError) {
                throw new Error(`Signed URL creation failed: ${urlError.message}`);
              }

              if (!signedUrlData?.signedUrl) {
                throw new Error("No signed URL received");
              }

              console.log(`✅ Image uploaded successfully: ${signedUrlData.signedUrl.substring(0, 50)}...`);
              return signedUrlData.signedUrl;
            } catch (error) {
              console.error("❌ Supabase upload error:", error.message);
              throw error;
            }
          }

          const url = await uploadToSupaBase();
          return url;
        } catch (error) {
          console.error("❌ Error processing image data:", error.message);
          throw error;
        }
      }
    }

    if (!imageGenerated) {
      throw new Error("No image was generated in the response");
    }

  } catch (error) {
    console.error("❌ Image generation failed:", error.message);
    throw error; // Re-throw to fail the entire process
  }
}

async function rewriteTitle(content) {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key not available - title rewriting required");
  }

  if (!content || content.length < 5) {
    throw new Error("Title content too short");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const prompt = `**Task:** Your job is to rewrite the title to remove the plagiarism or risk of getting copyright. Give only one under 10 words.
  **Title to process:**
"${content}"`;

  try {
    console.log("✏️ Rewriting title with Gemini...");
    const res = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 15000
      }
    );

    if (!res.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("Invalid title rewrite response");
    }

    const newTitle = res.data.candidates[0].content.parts[0].text.trim();
    
    if (newTitle.length < 5) {
      throw new Error("Generated title too short");
    }

    console.log(`✅ Title rewritten: "${newTitle}"`);
    return newTitle;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      throw new Error("Title rewrite timeout");
    } else {
      throw new Error(`Title rewrite error: ${error.response?.data || error.message}`);
    }
  }
}

async function uploadToDB(output) {
  try {
    if (!output?.title || !output?.text) {
      throw new Error("Missing required fields for database upload");
    }

    console.log(`💾 Uploading to database: "${output.title.substring(0, 30)}..."`);
    const res = await axios.post(
      "https://oyxprqbvhfpbzvtohqjv.supabase.co/functions/v1/publish-article",
      {
        title: output.title,
        text: output.text,
        image_link: output.image || null,
      },
      {
        timeout: 10000,
        headers: { "Content-Type": "application/json" }
      }
    );

    if (!res.data?.success) {
      throw new Error("Database upload failed - no success confirmation");
    }

    console.log("✅ Successfully uploaded to database");
    return res.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error("❌ Database upload timeout");
    } else if (error.response?.status === 400) {
      console.error("❌ Database upload failed - bad request:", error.response.data);
    } else if (error.response?.status === 500) {
      console.error("❌ Database upload failed - server error");
    } else {
      console.error("❌ Database upload error:", error.response?.data || error.message);
    }
    throw error;
  }
}

// Delay function with error handling
function delay(ms) {
  return new Promise((resolve) => {
    if (typeof ms !== 'number' || ms < 0) {
      console.warn("⚠️ Invalid delay value, using 1000ms");
      ms = 1000;
    }
    setTimeout(resolve, ms);
  });
}

async function main(count = 15) {
  console.log("🚀 Starting NDTV scraper with fail-fast approach...");
  
  let totalProcessed = 0;
  let totalSuccessful = 0;
  let totalFailed = 0;

  try {
    // Try RSS first, fallback to scraping if needed
    let articles = await scrapeNDTV_RSS(count);

    if (!articles.length) {
      console.log("❌ RSS failed. Attempting website scraping...");
      articles = await scrapeNDTV();
    }

    if (!articles.length) {
      throw new Error("No articles found from any source");
    }

    console.log(`\n✅ Found ${articles.length} articles to process.\n`);

    for (let i = 0; i < articles.length; i++) {
      totalProcessed++;
      const { title, link } = articles[i];
      
      console.log(`\n[${ i + 1}/${articles.length}] 📰 Processing: ${title.substring(0, 50)}...`);
      console.log(`🔗 ${link}`);

      try {
        // Get article content
        const content = await getFullArticle(link);
        if (!content || content.length < 100) {
          console.log("⚠️ Skipping – content too short or unavailable.");
          totalFailed++;
          continue;
        }

        // Process with AI - ALL THREE MUST SUCCEED
        console.log("🔄 Processing all three operations (content, title, image)...");
        
        // Execute all three operations - if any fail, the entire article processing fails
        const summary = await rewriteWithGemini(content);
        const newTitle = await rewriteTitle(title);
        const generatedImage = await generateImage(summary, slugify(newTitle));

        console.log(`📝 Title: "${newTitle}"`);
        console.log(`🖼️ Image: ${generatedImage ? 'Generated successfully' : 'Failed'}`);

        const output = {
          text: summary,
          title: newTitle,
          image: generatedImage
        };

        // Upload to database only if all three operations succeeded
        await uploadToDB(output);
        
        totalSuccessful++;
        console.log(`✅ Article ${i + 1} processed successfully - all operations completed`);

      } catch (error) {
        totalFailed++;
        console.error(`❌ Failed to process article ${i + 1}:`, error.message);
        console.log("⏭️ Skipping this article due to failure in required operations...");
      }

      // Rate limiting delay
      if (i < articles.length - 1) {
        console.log("⏱️ Waiting to avoid rate limits...");
        await delay(1500);
      }

      console.log("\n" + "=".repeat(80));
    }

  } catch (error) {
    console.error("❌ Critical error in main process:", error.message);
    process.exit(1);
  }

  // Final summary
  console.log("\n🏁 Processing Complete!");
  console.log(`📊 Summary:`);
  console.log(`   Total articles processed: ${totalProcessed}`);
  console.log(`   ✅ Successful: ${totalSuccessful}`);
  console.log(`   ❌ Failed: ${totalFailed}`);
  console.log(`   📈 Success rate: ${totalProcessed > 0 ? Math.round((totalSuccessful / totalProcessed) * 100) : 0}%`);

  if (totalSuccessful === 0) {
    console.log("⚠️ No articles were successfully processed. Check your configuration and network connection.");
    process.exit(1);
  }
}

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️ Received SIGINT. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️ Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

main();
