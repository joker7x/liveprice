
import { SUPABASE_URL, SUPABASE_KEY, TABLE_NAME, FULL_DB_URL, FULL_DB_KEY, FULL_TABLE_NAME, MEDHOME_API_URL } from '../constants';
import { Drug, DrugRaw, AdminStats, DrugFormData, FullDrug, LightDrug, CompanyStats, MedhomItem } from '../types';

const parsePrice = (val: string | number | undefined | null): number | null => {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
};

const normalizeDrug = (raw: DrugRaw): Drug => {
  const realId = raw.drug_no ? String(raw.drug_no) : String(raw.id);
  return {
    id: realId,
    nameEn: raw.name_en || raw.name || "Unknown",
    nameAr: raw.name_ar || raw.arabic || "",
    newPrice: parsePrice(raw.new_price ?? raw.price_new ?? raw.price),
    oldPrice: parsePrice(raw.old_price ?? raw.price_old ?? raw.oldprice),
    updatedAt: raw.update_date ?? raw.timestamp_ms ?? raw.updated_at ?? raw.Date_updated ?? null,
  };
};

export const fetchDrugs = async (offset: number, limit: number, search?: string, sortBy: 'date' | 'price_high' | 'price_low' = 'date', onlyChanged: boolean = false): Promise<Drug[]> => {
  try {
      let queryParams = `select=*&limit=${limit}&offset=${offset}`;
      if (sortBy === 'price_high') queryParams += `&order=new_price.desc.nullslast`;
      else if (sortBy === 'price_low') queryParams += `&order=new_price.asc.nullslast`;
      else queryParams += `&order=update_date.desc.nullslast`;

      if (search && search.trim() !== '') {
        const term = encodeURIComponent(search.trim());
        queryParams += `&or=(name_en.ilike.*${term}*,name_en.ilike.*${term}*)`; 
      }

      const url = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?${queryParams}`;
      const response = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
      if (!response.ok) return [];
      const data = await response.json();
      if (!Array.isArray(data)) return [];
      let normalized = data.map(normalizeDrug);
      if (onlyChanged) normalized = normalized.filter(d => d.oldPrice && d.newPrice && d.oldPrice !== d.newPrice);
      return normalized;
  } catch (error) { return []; }
};

export const fetchAdminStats = async (): Promise<AdminStats> => {
  try {
    const countUrl = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?select=id.count()`;
    const countRes = await fetch(countUrl, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    const countData = await countRes.json();
    const analyzeUrl = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?select=*&limit=200&order=update_date.desc`;
    const analyzeRes = await fetch(analyzeUrl, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    const analyzeRaw = await analyzeRes.json();
    const validRaw: DrugRaw[] = Array.isArray(analyzeRaw) ? analyzeRaw : [];
    const analyzedDrugs = validRaw.map(normalizeDrug);

    const topGainers = analyzedDrugs.filter(d => d.newPrice && d.oldPrice && d.newPrice > d.oldPrice).sort((a, b) => ((b.newPrice!-b.oldPrice!)/b.oldPrice!) - ((a.newPrice!-a.oldPrice!)/a.oldPrice!)).slice(0, 5);
    
    let healthScore = 100;
    const issues = { missingArabic: 0, zeroPrice: 0, missingOldPrice: 0 };
    analyzedDrugs.forEach(d => {
        if (!d.nameAr || d.nameAr.trim() === '') issues.missingArabic++;
        if (!d.newPrice || d.newPrice === 0) issues.zeroPrice++;
        if (!d.oldPrice) issues.missingOldPrice++;
    });
    const sampleSize = analyzedDrugs.length || 1;
    healthScore -= (issues.zeroPrice / sampleSize) * 50;
    healthScore -= (issues.missingArabic / sampleSize) * 30;
    healthScore = Math.max(0, Math.round(healthScore));

    let totalIncreasePct = 0; let increaseCount = 0;
    const priceRanges = { low: 0, mid: 0, high: 0 };
    analyzedDrugs.forEach(d => {
        if (d.newPrice && d.oldPrice && d.newPrice > d.oldPrice) { totalIncreasePct += ((d.newPrice - d.oldPrice) / d.oldPrice) * 100; increaseCount++; }
        if (d.newPrice) { if (d.newPrice < 50) priceRanges.low++; else if (d.newPrice <= 200) priceRanges.mid++; else priceRanges.high++; }
    });
    const avgIncrease = increaseCount > 0 ? Math.round(totalIncreasePct / increaseCount) : 0;

    return { totalDrugs: Array.isArray(countData) ? countData[0]?.count || 0 : 0, totalChanged: 0, lastUpdate: validRaw[0]?.update_date || new Date().toISOString(), topGainers, healthScore, averageIncrease: avgIncrease, priceRanges, dataIssues: issues };
  } catch (error) {
    return { totalDrugs: 0, totalChanged: 0, lastUpdate: new Date().toISOString(), topGainers: [], healthScore: 0, averageIncrease: 0, priceRanges: { low: 0, mid: 0, high: 0 }, dataIssues: { missingArabic: 0, zeroPrice: 0, missingOldPrice: 0 } };
  }
};

export const insertDrug = async (data: DrugFormData): Promise<void> => {
  const payload = { name_en: data.nameEn, new_price: data.newPrice, old_price: data.oldPrice || null, update_date: String(Date.now()), drug_no: data.drugNo ? String(data.drugNo) : String(Date.now()).slice(-8) };
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}`, { method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error('Failed to add drug');
};

export const updateDrug = async (id: string, data: DrugFormData): Promise<void> => {
  const payload = { name_en: data.nameEn, new_price: data.newPrice, old_price: data.oldPrice || null, update_date: String(Date.now()) };
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}?drug_no=eq.${id}`, { method: 'PATCH', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error('Failed to update drug');
};

export const deleteDrug = async (id: string): Promise<void> => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}?drug_no=eq.${id}`, { method: 'DELETE', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, }, });
  if (!response.ok) throw new Error('Failed to delete drug');
};

export const deleteDrugs = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) return;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}?drug_no=in.(${ids.join(',')})`, { method: 'DELETE', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, }, });
  if (!response.ok) throw new Error('Failed to delete drugs');
};

export const searchFullArchive = async (search: string): Promise<FullDrug[]> => {
  if (!search || search.trim().length < 2) return [];
  const term = encodeURIComponent(search.trim());
  try {
      const response = await fetch(`${FULL_DB_URL}/rest/v1/${FULL_TABLE_NAME}?select=*&limit=30&or=(name_en.ilike.*${term}*,name_ar.ilike.*${term}*)`, { headers: { apikey: FULL_DB_KEY, Authorization: `Bearer ${FULL_DB_KEY}`, }, });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
  } catch (e) { return []; }
};

export const fetchAlternatives = async (composition: string, excludeId: number): Promise<FullDrug[]> => {
  if (!composition) return [];
  const term = encodeURIComponent(composition.trim());
  try {
      const response = await fetch(`${FULL_DB_URL}/rest/v1/${FULL_TABLE_NAME}?composition=eq.${term}&id=neq.${excludeId}&limit=20&select=*`, { headers: { apikey: FULL_DB_KEY, Authorization: `Bearer ${FULL_DB_KEY}`, }, });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
  } catch (e) { return []; }
};

const chunkArray = <T>(arr: T[], size: number): T[][] => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

export const syncMarketData = async (onProgress: (percent: number, status: string) => void, forceFullSync: boolean = false): Promise<{ processed: number, skipped: number, total: number, changes: Array<{name: string, old: string, new: string}> }> => {
  onProgress(5, 'جاري قراءة بيانات التحديثات الحالية...');
  try {
      const sourceResponse = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}?select=*`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, }, });
      if (!sourceResponse.ok) throw new Error(`فشل قراءة بيانات التحديثات`);
      const sourceDataRaw = await sourceResponse.json();
      const sourceData: DrugRaw[] = Array.isArray(sourceDataRaw) ? sourceDataRaw : [];
      if (sourceData.length === 0) { onProgress(100, 'لا توجد تحديثات.'); return { processed: 0, skipped: 0, total: 0, changes: [] }; }

      const uniqueUpdatesMap = new Map<string, DrugRaw>();
      sourceData.forEach(item => { if (!item.drug_no) return; const drugId = String(item.drug_no); if (!uniqueUpdatesMap.has(drugId) || Number(item.update_date||0) > Number(uniqueUpdatesMap.get(drugId)!.update_date||0)) uniqueUpdatesMap.set(drugId, item); });
      const uniqueSourceItems = Array.from(uniqueUpdatesMap.values());
      const idsToCheck = uniqueSourceItems.map(i => i.drug_no).filter(Boolean) as string[];

      onProgress(15, `جاري فحص ${idsToCheck.length} صنف في الأرشيف...`);
      const idChunks = chunkArray(idsToCheck, 50); const archiveMap = new Map<string, string>();
      for (let i = 0; i < idChunks.length; i++) {
          try {
             const res = await fetch(`${FULL_DB_URL}/rest/v1/${FULL_TABLE_NAME}?id=in.(${idChunks[i].join(',')})&select=id,price_new`, { headers: { apikey: FULL_DB_KEY, Authorization: `Bearer ${FULL_DB_KEY}` } });
             if (res.ok) { (await res.json() as any[]).forEach(d => archiveMap.set(String(d.id), d.price_new)); }
          } catch(e) {}
          onProgress(15 + Math.round((i / idChunks.length) * 20), `مقارنة البيانات (${i+1}/${idChunks.length})...`);
      }

      const itemsToSync: any[] = []; const changesReport: Array<{name: string, old: string, new: string}> = []; let skippedCount = 0;
      uniqueSourceItems.forEach(src => {
          const id = String(src.drug_no); const srcPrice = String(src.new_price); const archivePrice = archiveMap.get(id);
          if ((archivePrice !== srcPrice) || !archiveMap.has(id) || forceFullSync) {
              const parsedId = parseInt(id, 10);
              if (!isNaN(parsedId)) {
                  itemsToSync.push({ id: parsedId, name_en: src.name_en || 'Unknown', name_ar: src.name_ar || src.arabic || null, price_new: src.new_price ? String(src.new_price) : null, price_old: src.old_price ? String(src.old_price) : null, timestamp_ms: src.update_date ? String(src.update_date) : String(Date.now()) });
                  if (archivePrice !== srcPrice) changesReport.push({ name: src.name_en || 'Unknown', old: archivePrice ? `${archivePrice}` : '(New)', new: `${srcPrice}` });
              }
          } else skippedCount++;
      });

      if (itemsToSync.length === 0) { onProgress(100, `لا توجد تغييرات.`); return { processed: 0, skipped: skippedCount, total: uniqueSourceItems.length, changes: [] }; }
      onProgress(40, `تم رصد ${itemsToSync.length} تغيير فعلي. جاري التحديث...`);
      const upsertChunks = chunkArray(itemsToSync, 50); let processed = 0;
      for (let i = 0; i < upsertChunks.length; i++) {
        onProgress(40 + Math.round((i / upsertChunks.length) * 60), `> كتابة التغييرات: دفعة ${i+1}/${upsertChunks.length}...`);
        await fetch(`${FULL_DB_URL}/rest/v1/${FULL_TABLE_NAME}`, { method: 'POST', headers: { apikey: FULL_DB_KEY, Authorization: `Bearer ${FULL_DB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }, body: JSON.stringify(upsertChunks[i]) });
        processed += upsertChunks[i].length;
      }
      onProgress(100, 'تم التحديث بنجاح!');
      return { processed, skipped: skippedCount, total: uniqueSourceItems.length, changes: changesReport };
  } catch (error: any) { throw error; }
};

export const fetchFullArchiveLight = async (onProgress: (count: number) => void): Promise<LightDrug[]> => {
    const fields = 'id,name_en,price_new,company,composition'; const batchSize = 3000; let allDrugs: LightDrug[] = []; let fetched = 0; let offset = 0; let shouldContinue = true;
    try {
        while (shouldContinue) {
            const res = await fetch(`${FULL_DB_URL}/rest/v1/${FULL_TABLE_NAME}?select=${fields}&limit=${batchSize}&offset=${offset}`, { headers: { apikey: FULL_DB_KEY, Authorization: `Bearer ${FULL_DB_KEY}` } });
            if (res.ok) {
                const raw = await res.json();
                if (Array.isArray(raw) && raw.length > 0) {
                    const mapped: LightDrug[] = raw.map(r => ({ id: r.id, n: r.name_en, p: parseFloat(r.price_new) || 0, c: r.company || 'Unknown', a: r.composition || 'Unknown' }));
                    allDrugs = [...allDrugs, ...mapped]; fetched += mapped.length; offset += mapped.length; onProgress(fetched);
                    if (raw.length < batchSize) shouldContinue = false;
                } else shouldContinue = false;
            } else shouldContinue = false;
        }
    } catch(e) {}
    return allDrugs;
  };

export const getUniqueCompanies = (drugs: LightDrug[]): CompanyStats[] => {
    const map = new Map<string, number>();
    drugs.forEach(d => { const name = d.c.trim() || 'Unknown'; map.set(name, (map.get(name) || 0) + 1); });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
};

export const fetchCompanyProducts = async (companyName: string): Promise<FullDrug[]> => {
    try {
        const response = await fetch(`${FULL_DB_URL}/rest/v1/${FULL_TABLE_NAME}?company=eq.${encodeURIComponent(companyName)}&select=*&order=name_en.asc`, { headers: { apikey: FULL_DB_KEY, Authorization: `Bearer ${FULL_DB_KEY}` } });
        if (!response.ok) return [];
        return await response.json();
    } catch (e) { return []; }
};

// =========================================================
//  MEDHOME API IMPLEMENTATION
// =========================================================

// 1. Fetch raw data from Medhom directly (No Proxy, No Regex)
export async function fetchMedhomUpdates(limit: number = 100): Promise<MedhomItem[]> {
  const response = await fetch(MEDHOME_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
    },
    body: `lastpricesForFlutter=${limit}`,
  });

  if (!response.ok) {
    throw new Error(`Medhom API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data as MedhomItem[];
}

// 2. Sync to Supabase with upsert (No duplicates)
export const syncMedhomUpdatesToSupabase = async (limit: number = 100): Promise<void> => {
    // A. Fetch
    const items = await fetchMedhomUpdates(limit);

    if (!Array.isArray(items) || items.length === 0) {
        throw new Error("لا توجد بيانات جديدة من ميدهوم");
    }

    // B. Map to Supabase Schema
    const rows = items.map(item => ({
        drug_no: item.id,          // Primary Unique Key
        name_en: item.name,
        name_ar: item.arabic,
        old_price: item.oldprice ? item.oldprice : null,
        new_price: item.price,
        update_date: item.Date_updated || String(Date.now()),
        source: 'medhom'
    }));

    // C. Upsert (Batch)
    const chunks = chunkArray(rows, 50);
    
    for (const chunk of chunks) {
        // 'drugs' table, upsert based on 'drug_no' column (Mapped from Medhom ID)
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}?on_conflict=drug_no`, {
            method: 'POST',
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(chunk)
        });
        
        if (!res.ok) {
            const errText = await res.text();
            console.error("Supabase upsert error:", errText);
            throw new Error(`فشل تحديث قاعدة البيانات: ${res.status}`);
        }
    }
};

// Compatible Wrapper
export const fetchAndSyncExternalUpdates = async (): Promise<void> => {
    await syncMedhomUpdatesToSupabase(400); // Default to 400 items
};
