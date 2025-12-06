import { TAWREED_BASE_URL } from '../constants';
import { TawreedProduct } from '../types';

// --- SMART NAME CLEANING UTILITY ---
function cleanDrugName(name: string): string {
    if (!name) return "";
    let clean = name.toLowerCase();

    // 1. Remove common dosage strengths (e.g., 500mg, 10ml, 50 gm, 100 i.u.)
    clean = clean.replace(/\b\d+(\.\d+)?\s*(mg|ml|gm|g|mcg|iu|unit|u)\b/g, '');
    
    // 2. Remove common dosage forms
    clean = clean.replace(/\b(tab|caps?|capsules?|tablets?|vials?|amps?|ampoules?|syrup|susp|suspension|cream|gel|oint|ointment|drops|eye|ear|nasal|sol|solution|inj|injection|supp|suppositories|sachet|eff)\b/g, '');

    // 3. Remove pack sizes (e.g., 20's, 10's, 1x10)
    clean = clean.replace(/\b\d+\s*('s|s|x\d+)\b/g, '');

    // 4. Remove special characters
    clean = clean.replace(/[()\[\]\-\/\\,]/g, ' ');
    clean = clean.replace(/\s+/g, ' ').trim();

    return clean;
}

// --- PARSER: Convert WhatsApp Text to Object ---
function parseWebhookResponse(text: string): TawreedProduct[] {
    const products: TawreedProduct[] = [];
    
    // Regex to match the summary format from your webhook:
    // 1️⃣ *Product Name*
    // 🏷️ متوسط خصم: 15.0% | أفضل سعر: 45.5 ج.م
    // 📦 إجمالي كمية متاحة: 100
    
    const lines = text.split('\n');
    let currentProduct: Partial<TawreedProduct> | null = null;
    let indexCounter = 0;

    for (let line of lines) {
        line = line.trim();

        // Detect Item Start: "1️⃣ *Name*"
        const nameMatch = line.match(/^\d+️⃣\s*\*(.+)\*$/);
        if (nameMatch) {
            if (currentProduct && currentProduct.productName) {
                 products.push(currentProduct as TawreedProduct);
            }
            indexCounter++;
            currentProduct = {
                productId: `webhook_${indexCounter}`,
                productName: nameMatch[1],
                stores: [], 
                totalQty: 0,
                avgDiscount: null,
                bestSale: null
            };
            continue;
        }

        if (currentProduct) {
            // Extract Price: "🏷️ ... أفضل سعر: 45.5 ج.م"
            if (line.includes('أفضل سعر')) {
                const priceMatch = line.match(/أفضل سعر:\s*([\d.]+)/);
                if (priceMatch) {
                    currentProduct.bestSale = parseFloat(priceMatch[1]);
                }
            }

            // Extract Discount: "🏷️ متوسط خصم: 15.0%"
            if (line.includes('خصم')) {
                const discountMatch = line.match(/خصم:\s*([\d.]+)%/);
                if (discountMatch) {
                    currentProduct.avgDiscount = parseFloat(discountMatch[1]);
                }
            }

            // Extract Qty: "📦 إجمالي كمية متاحة: 100"
            if (line.includes('كمية متاحة')) {
                const qtyMatch = line.match(/كمية متاحة:\s*(\d+)/);
                if (qtyMatch) {
                    currentProduct.totalQty = parseInt(qtyMatch[1], 10);
                }
            }
        }
    }

    // Push last item
    if (currentProduct && currentProduct.productName) {
        products.push(currentProduct as TawreedProduct);
    }

    return products;
}

// --- SAFE FETCH UTILITY (MULTI-PROXY) ---
async function fetchSafe(url: string, options: RequestInit): Promise<Response> {
    const proxies = [
        (u: string) => u, // Attempt direct first
        (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
        (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
    ];

    let lastError: any = null;

    for (const makeUrl of proxies) {
        try {
            const target = makeUrl(url);
            // console.log(`Attempting fetch via: ${target}`);
            const res = await fetch(target, options);
            if (res.ok) return res;
            lastError = new Error(`Status ${res.status}`);
        } catch (err) {
            lastError = err;
        }
    }
    
    console.warn("All fetchSafe attempts failed.");
    throw lastError || new Error("Failed to fetch");
}

// --- MAIN FUNCTION ---
export async function checkDrugAvailability(originalName: string): Promise<TawreedProduct[]> {
    const cleanedName = cleanDrugName(originalName);
    if (!cleanedName || cleanedName.length < 2) return [];

    try {
        // Mimic Twilio: Body=text
        const formData = new URLSearchParams();
        formData.append('Body', cleanedName);
        formData.append('From', 'BrowserClient'); // Mock sender

        // Use fetchSafe with multi-proxy
        const response = await fetchSafe(TAWREED_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });

        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const messageText = xmlDoc.getElementsByTagName("Message")[0]?.textContent || "";

        if (!messageText || messageText.includes("لم يتم العثور")) {
            return [];
        }

        return parseWebhookResponse(messageText);

    } catch (e) {
        console.error("Tawreed Webhook Error", e);
        return [];
    }
}

// --- DEBUG MODE ---
export interface DebugTrace {
    step: string;
    message: string;
    status: 'info' | 'success' | 'warning' | 'error';
    timestamp: number;
}

export interface DebugResult {
    traces: DebugTrace[];
    finalResult: any;
}

export async function checkDrugAvailabilityDebug(originalName: string): Promise<DebugResult> {
    const traces: DebugTrace[] = [];
    const addTrace = (msg: string, status: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        traces.push({ step: 'Step', message: msg, status, timestamp: Date.now() });
    };

    const cleanedName = cleanDrugName(originalName);
    addTrace(`Searching for: "${cleanedName}"`, 'info');

    try {
        const formData = new URLSearchParams();
        formData.append('Body', cleanedName);
        formData.append('From', 'BrowserClient');
        
        addTrace(`POST ${TAWREED_BASE_URL}`, 'info');
        
        // Manual trace of attempts
        let response;
        try {
            response = await fetch(TAWREED_BASE_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData });
            addTrace('Direct connection succeeded', 'info');
        } catch (e) {
            addTrace('Direct fetch failed, trying proxy...', 'warning');
            try {
                response = await fetch(`https://corsproxy.io/?${encodeURIComponent(TAWREED_BASE_URL)}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData });
                addTrace('Proxy connection succeeded', 'info');
            } catch(e2) {
                addTrace('All fetch attempts failed', 'error');
                return { traces, finalResult: null };
            }
        }

        if (!response || !response.ok) {
            addTrace(`HTTP Error`, 'error');
            return { traces, finalResult: null };
        }

        const xmlText = await response.text();
        addTrace(`Received XML response`, 'success');
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const messageText = xmlDoc.getElementsByTagName("Message")[0]?.textContent || "";

        addTrace(`Parsed Text: ${messageText.slice(0, 50)}...`, 'info');

        if (!messageText || messageText.includes("لم يتم العثور")) {
             addTrace("Result: No matches found.", 'warning');
             return { traces, finalResult: [] };
        }

        const results = parseWebhookResponse(messageText);
        addTrace(`Parsed ${results.length} products.`, 'success');
        
        return { traces, finalResult: results };

    } catch (e: any) {
        addTrace(`Exception: ${e.message}`, 'error');
        return { traces, finalResult: null };
    }
}