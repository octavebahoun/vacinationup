import { createWorker } from 'tesseract.js';

/**
 * Helper to convert file to base64
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Perform OCR on a file/image and parse children records from it.
 * @param {File|string} imageFile File object or image URL
 * @param {function} onProgress Callback for progress tracking
 * @param {object} settings Settings containing api keys and preferred engine
 * @returns {Promise<Array>} List of pre-filled records parsed from the image
 */
export const performOCR = async (imageFile, onProgress, settings) => {
  if (settings?.ocrEngine === 'gemini' && settings?.geminiApiKey) {
    let progressVal = 0;
    const progressInterval = setInterval(() => {
      progressVal = Math.min(progressVal + Math.floor(Math.random() * 15) + 5, 95);
      onProgress(progressVal);
    }, 400);

    try {
      const base64Data = await fileToBase64(imageFile);
      const apiKey = settings.geminiApiKey.trim();

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "Tu es un assistant médical spécialisé en nutrition et vaccination infantile. Voici l'image d'une page de registre manuscrit ou imprimé. Analyse-la de façon extrêmement précise pour en extraire toutes les lignes du tableau sous forme de tableau JSON. Pour chaque enfant détecté, renvoie les propriétés suivantes (laisse les champs textuels vides s'ils sont absents, mets false par défaut pour edema et screeningAnemia, et estime approximativement la date de naissance YYYY-MM-DD d'après l'âge en mois si mentionné par rapport à la date du jour):\n- motherName (Nom de la mère)\n- childName (Prénom de l'enfant)\n- birthDate (Date de naissance au format YYYY-MM-DD)\n- sex (Sexe de l'enfant, uniquement 'M' ou 'F')\n- quartier (Quartier)\n- phone (Téléphone)\n- weight (Poids en kg, nombre)\n- height (Taille en cm, nombre)\n- score (Indice Poids/Taille ou score: -3, -2, -1.5, -1, 0, 1, 1.5, etc.)\n- pb (Périmètre brachial/Tour de bras PB: 'ROUGE', 'JAUNE' ou 'VERT')\n- edema (Œdèmes bilatéraux: true ou false)\n- temp (Température en °C, nombre)\n- screeningAnemia (Anémie détectée: true ou false)\n- screeningMalnutrition (Statut nutritionnel: 'MAS', 'MAM' ou 'NON' selon le Z-score/Poids-Taille: -3 = MAS, -2 = MAM, autre = NON)\n\nRenvoie uniquement un tableau JSON valide contenant la liste d'objets, directement parsable."
                },
                {
                  inlineData: {
                    mimeType: imageFile.type || "image/jpeg",
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Erreur API Gemini: ${response.status} - ${errText}`);
      }

      const resJson = await response.json();
      const textResult = resJson.contents?.[0]?.parts?.[0]?.text || resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResult) {
        throw new Error("Réponse vide de l'API Gemini");
      }

      const parsedRecords = JSON.parse(textResult.trim());
      onProgress(100);

      if (!Array.isArray(parsedRecords)) {
        throw new Error("Le résultat Gemini n'est pas un tableau d'enfants");
      }

      return parsedRecords.map(r => ({
        id: 'ocr_' + Math.random().toString(36).substr(2, 9),
        motherName: r.motherName || '',
        childName: r.childName || '',
        birthDate: r.birthDate || new Date().toISOString().split('T')[0],
        sex: r.sex === 'M' || r.sex === 'F' ? r.sex : 'F',
        quartier: r.quartier || '',
        phone: r.phone || '',
        weight: r.weight ? parseFloat(r.weight) : '',
        height: r.height ? parseFloat(r.height) : '',
        score: r.score !== undefined ? String(r.score) : '0',
        pb: r.pb === 'ROUGE' || r.pb === 'JAUNE' || r.pb === 'VERT' ? r.pb : 'VERT',
        edema: !!r.edema,
        temp: r.temp ? parseFloat(r.temp) : '',
        screeningAnemia: !!r.screeningAnemia,
        screeningMalnutrition: r.screeningMalnutrition || 'NON'
      }));

    } catch (error) {
      clearInterval(progressInterval);
      console.error('Gemini OCR Error:', error);
      throw error;
    }
  }

  // Local Tesseract.js fallback
  let worker = null;
  try {
    worker = await createWorker('fra', 1, {
      logger: (m) => {
        if (m.status === 'recognizing') {
          onProgress(Math.round(m.progress * 100));
        }
      }
    });

    const { data: { text, lines } } = await worker.recognize(imageFile);
    console.log('Raw OCR Text:', text);

    const parsedRecords = parseOcrLines(lines || []);
    return parsedRecords;
  } catch (error) {
    console.error('OCR Error:', error);
    throw error;
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
};


/**
 * Parses lines of OCR text into kid records based on regex heuristics
 * @param {Array} ocrLines Array of OCR line objects
 * @returns {Array} List of structured objects
 */
function parseOcrLines(ocrLines) {
  const records = [];

  for (const lineObj of ocrLines) {
    const text = lineObj.text.trim();
    if (!text || text.length < 5) continue; // Skip short/empty lines

    // Skip column headers or date sections
    if (
      text.toLowerCase().includes('registre') ||
      text.toLowerCase().includes('suivi') ||
      text.toLowerCase().includes('enfants') ||
      text.toLowerCase().includes('nom et prenom') ||
      text.toLowerCase().includes('date naissance')
    ) {
      continue;
    }

    // Try to parse an entry
    // A valid row usually has:
    // - Sexe: M or F
    // - Age/Date of Birth: "X mois" or "X an" or "X ans"
    // - Score (Indice poids/taille): -3, -2, -1.5, -1, 0, 1, 1.5, 1,5, etc.

    // 1. Find Gender
    let sex = '';
    // Look for isolated M or F, or specific boundaries
    const mMatch = text.match(/\b(M|Garcon|Garçon)\b/i);
    const fMatch = text.match(/\b(F|Fille)\b/i);
    if (mMatch) sex = 'M';
    else if (fMatch) sex = 'F';

    // 2. Find Age
    let ageMonths = null;
    let birthDate = '';
    
    // Look for "6 mois", "10 mois", "1 an", "1an", etc.
    const ageMoisMatch = text.match(/(\d+)\s*mois/i);
    const ageAnMatch = text.match(/(\d+)\s*an/i);
    
    if (ageMoisMatch) {
      ageMonths = parseInt(ageMoisMatch[1], 10);
    } else if (ageAnMatch) {
      const years = parseInt(ageAnMatch[1], 10);
      ageMonths = years * 12;
    }

    if (ageMonths !== null) {
      // Calculate a dummy birth date based on ageMonths to satisfy the date field
      const d = new Date();
      d.setMonth(d.getMonth() - ageMonths);
      birthDate = d.toISOString().split('T')[0];
    }

    // 3. Find Score (Indice poids/taille)
    let score = null;
    // Look for negative numbers (-3, -2, -1.5, -1, -1,5) or 0 or positive
    // Match values: -3, -2, -1.5, -1, 0, 1, 1.5, -1,5, etc.
    const scoreMatch = text.match(/(-\d([.,]\d)?|\b0\b|\b1([.,]5)?)/);
    if (scoreMatch) {
      const scoreStr = scoreMatch[1].replace(',', '.');
      score = parseFloat(scoreStr);
    }

    // 4. Find Weight
    let weight = '';
    const weightMatch = text.match(/(\d+[\s.,]\d{3})\s*(kg)?/i) || text.match(/(\d+[.,]\d+)\s*kg/i);
    if (weightMatch) {
      weight = weightMatch[1].replace(',', '.').replace(' ', '');
    }

    // 5. Find Height
    let height = '';
    const heightMatch = text.match(/(\d{2,3})\s*(cm)?/i);
    if (heightMatch) {
      height = heightMatch[1];
    }

    // 6. Split names (heuristics)
    // Assume text before gender/age is Mother / Child names
    let motherName = '';
    let childName = '';
    const words = text.split(/\s+/);
    
    // Basic clean up of text to extract names
    const nameCandidate = words.slice(0, 3).join(' ').replace(/[^a-zA-Z\s]/g, '').trim();
    if (nameCandidate.length > 2) {
      motherName = nameCandidate;
      childName = words.slice(3, 5).join(' ').replace(/[^a-zA-Z\s]/g, '').trim();
    }

    // Only add if we detected at least a gender or an age or a score, otherwise it's noise
    if (sex || ageMonths !== null || score !== null) {
      records.push({
        id: 'ocr_' + Math.random().toString(36).substr(2, 9),
        motherName: motherName || 'Nom Mère',
        childName: childName || 'Prénom Enfant',
        birthDate: birthDate || new Date().toISOString().split('T')[0],
        sex: sex || 'F', // default to F if not detected
        quartier: 'Quartier',
        phone: '',
        weight: weight ? parseFloat(weight) : '',
        height: height ? parseFloat(height) : '',
        score: score !== null ? score : 0,
        pb: 'VERT', // default
        edema: false,
        temp: '',
        screeningAnemia: false,
        screeningMalnutrition: score === -3 ? 'MAS' : score === -2 ? 'MAM' : 'NON',
        rawText: text // Keep raw text for debugging/reference
      });
    }
  }

  return records;
}
