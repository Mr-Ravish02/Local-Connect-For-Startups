import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { haversineDistance } from './geolocation';

// Primary requested model with fallback support
const PRIMARY_MODEL = 'llama3-8b-8192';
const FALLBACK_MODELS = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'];
const GROQ_API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

// In-memory catalog cache with 60-second TTL
let cachedCatalog = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000;

/**
 * Fetches real shop and product data from Firestore and formats
 * a concise context string for the system prompt.
 */
export async function getLiveCatalogContext(userLocation = null) {
  const now = Date.now();
  if (cachedCatalog && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedCatalog;
  }

  try {
    // 1. Fetch all shops
    const shopsSnap = await getDocs(collection(db, 'shops'));
    const shops = [];
    const shopMap = {};

    shopsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const shopObj = {
        id: docSnap.id,
        name: data.shopName || data.name || 'Unnamed Shop',
        category: data.category || 'General',
        address: data.address || 'Address not listed',
        description: data.description || '',
        latitude: data.latitude,
        longitude: data.longitude,
      };

      if (
        userLocation &&
        typeof data.latitude === 'number' &&
        typeof data.longitude === 'number'
      ) {
        shopObj.distanceKm = haversineDistance(
          userLocation.latitude,
          userLocation.longitude,
          data.latitude,
          data.longitude
        );
      }

      shops.push(shopObj);
      shopMap[docSnap.id] = shopObj;
    });

    // 2. Fetch all products
    const productsSnap = await getDocs(collection(db, 'products'));
    const products = [];

    productsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const shop = shopMap[data.shopId];
      products.push({
        id: docSnap.id,
        name: data.name || data.title || 'Unnamed Product',
        category: data.category || (shop ? shop.category : 'General'),
        price: data.price != null ? `₹${data.price}` : 'Price on inquiry',
        inStock: data.inStock !== false && data.stockStatus !== 'out_of_stock',
        stockStatus: data.stockStatus || (data.inStock === false ? 'out_of_stock' : 'in_stock'),
        shopId: data.shopId,
        shopName: shop ? shop.name : 'Unknown Shop',
        description: data.description || '',
      });
    });

    cachedCatalog = { shops, products };
    lastCacheTime = now;
    return cachedCatalog;
  } catch (err) {
    console.error('Error fetching live catalog for AI assistant:', err);
    // Return stale cache if available, otherwise empty
    return cachedCatalog || { shops: [], products: [] };
  }
}

/**
 * Builds the system prompt injecting real Firestore data.
 */
export function buildSystemPrompt(catalogData, userLocation = null) {
  const { shops = [], products = [] } = catalogData;

  // Format shops
  const shopsFormatted = shops.map((s, idx) => {
    const distText = s.distanceKm != null ? ` [~${s.distanceKm.toFixed(1)} km away]` : '';
    return `${idx + 1}. **${s.name}** (Category: ${s.category})
   - Shop ID: ${s.id}
   - Address: ${s.address}${distText}
   - Description: ${s.description || 'N/A'}`;
  }).join('\n');

  // Format products
  const productsFormatted = products.map((p, idx) => {
    const stockBadge = p.inStock ? 'IN STOCK' : 'OUT OF STOCK';
    return `${idx + 1}. **${p.name}** - ${p.price} [${stockBadge}]
   - Shop: ${p.shopName} (Shop ID: ${p.shopId})
   - Category: ${p.category}
   - Description: ${p.description || 'N/A'}`;
  }).join('\n');

  const locationText = userLocation
    ? `Customer's current GPS coordinates: Lat ${userLocation.latitude.toFixed(4)}, Lng ${userLocation.longitude.toFixed(4)}.`
    : 'Customer location is not shared or unavailable.';

  return `You are "HiveBot", the official AI shopping assistant for LocalHive (Local Connect For Startups).
Your mission is to help shoppers discover real local shops, find products, verify in-stock availability, compare prices, and get directions.

=======================================================
REAL-TIME DATABASE OF LOCALHIVE SHOPS & INVENTORY:
=======================================================
${locationText}

REGISTERED SHOPS (${shops.length} total):
${shopsFormatted || 'No shops currently registered.'}

CURRENT PRODUCT CATALOG (${products.length} items total):
${productsFormatted || 'No products currently listed in the catalog.'}

=======================================================
STRICT GUIDELINES FOR ACCURATE RESPONSES:
=======================================================
1. REAL DATA ONLY: Base your answers ONLY on the real shops and products listed above. NEVER hallucinate, fabricate, or assume inventory or shops that are not explicitly present in the data.
2. PRODUCT INVENTORY & STOCK:
   - When asked if an item is available (e.g. "is a size M jacket available?"):
     - Search the listed products.
     - If the product exists, state the shop name, price, stock status, and provide the shop link.
     - If the product is NOT in the database, clearly state: "Currently, [item name] is not listed in our database by any shop." Then suggest relevant shops in that category (e.g. Clothing shops) where the customer can click into the shop and use the "Send Inquiry" button to ask the shop owner directly.
3. SHOP RECOMMENDATIONS:
   - When asked for nearby shops or specific categories (e.g. "which shops sell cycles nearby?"):
     - List all relevant shops matching that category (or selling products related to cycles).
     - State their name, address, and estimated distance if available.
     - Link to each shop using Markdown in this format: [Shop Name](/shop/{shopId}).
4. STYLE & TONE:
   - Be helpful, conversational, polite, and concise.
   - Use clean Markdown: bold shop/product names, bullet lists, and clear price tags.
   - Mention that customers can click into any shop page to browse all items or send a direct message to the shop owner.`;
}

/**
 * Sends a chat message to the Groq API with conversational history and live data.
 * Handles model fallback if llama3-8b-8192 is decommissioned.
 */
export async function sendGroqChatMessage({
  messages,
  userLocation = null,
  customApiKey = null,
}) {
  const apiKey =
    customApiKey ||
    import.meta.env.VITE_GROQ_API_KEY ||
    '';

  if (!apiKey || !apiKey.trim() || apiKey === 'YOUR_GROQ_API_KEY') {
    return {
      success: false,
      error: 'MISSING_API_KEY',
      reply:
        '⚠️ **Groq API Key Required**\n\nPlease add your Groq API key to your `.env.local` file:\n```env\nVITE_GROQ_API_KEY=gsk_...\n```\nAfter adding the key, reload the page to activate HiveBot!',
    };
  }

  // 1. Fetch real-time catalog from Firestore
  const catalogData = await getLiveCatalogContext(userLocation);
  const systemPrompt = buildSystemPrompt(catalogData, userLocation);

  // 2. Prepare payload (system message + recent conversation history)
  // Keep last 8 messages to maintain speed & context limit
  const recentMessages = messages.slice(-8).map((m) => ({
    role: m.sender === 'user' ? 'user' : 'assistant',
    content: m.text,
  }));

  const payloadMessages = [
    { role: 'system', content: systemPrompt },
    ...recentMessages,
  ];

  // 3. Attempt API call with requested model and fallback
  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const response = await fetch(GROQ_API_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: payloadMessages,
          temperature: 0.6,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || response.statusText;

        // If the model is decommissioned or not found, try fallback model
        if (
          response.status === 400 ||
          response.status === 404 ||
          errorMsg.toLowerCase().includes('model') ||
          errorMsg.toLowerCase().includes('decommissioned')
        ) {
          console.warn(`Groq model ${model} failed: ${errorMsg}. Trying fallback...`);
          lastError = errorMsg;
          continue;
        }

        if (response.status === 401) {
          return {
            success: false,
            error: 'INVALID_API_KEY',
            reply:
              '❌ **Invalid Groq API Key**\n\nThe provided API key was rejected by Groq. Please check that your `VITE_GROQ_API_KEY` in `.env.local` is correct and active.',
          };
        }

        throw new Error(errorMsg || `Groq API returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const reply =
        data.choices?.[0]?.message?.content ||
        "I'm sorry, I couldn't generate a response. Please try again.";

      return {
        success: true,
        reply,
        modelUsed: model,
      };
    } catch (err) {
      console.warn(`Attempt with model ${model} threw error:`, err);
      lastError = err.message;
    }
  }

  return {
    success: false,
    error: 'REQUEST_FAILED',
    reply: `⚠️ Sorry, I encountered an error connecting to Groq: ${lastError || 'Network request failed'}. Please try again shortly.`,
  };
}
