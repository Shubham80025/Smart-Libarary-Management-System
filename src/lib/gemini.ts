import { GoogleGenAI, Type, Content, FunctionDeclaration } from '@google/genai';
import { db } from './firebase';
import { collection, getDocs, query } from 'firebase/firestore';

let aiInstance: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiInstance;
}

export async function chatAboutBook(bookDetails: {title: string, author: string, category: string}, history: Content[], userMessage: string) {
  try {
    const systemInstruction = `You are a helpful and knowledgeable library assistant. 
    You are answering questions about the book "${bookDetails.title}" by ${bookDetails.author}. 
    Category is: ${bookDetails.category}.
    Be concise, format your answers with clean formatting, bullet points where applicable, and highlight key insights.`;

    const ai = getAiClient();
    
    // We have to simulate the history or pass it in if using the SDK.
    // In GenAI SDK, chat doesn't initialize with past history directly via create unless you iterate.
    // Instead of raw multi-turn if it's complex, we can just send the accumulated parts. But let's build the prompt.
    // The Gemini SDK lets you pass history.
    // Actually, according to docs, ai.chats.create has no direct 'history' in config in this exact SDK if not specified.
    // Let's just generate Content based on history.
    const allContents = [
      { role: 'user', parts: [{text: `Context: You are answering about "${bookDetails.title}" by ${bookDetails.author}.`}] },
      { role: 'model', parts: [{text: `I understand. I am ready to answer questions about this book.`}] },
      ...history,
      { role: 'user', parts: [{text: userMessage}] }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: allContents,
      config: {
        systemInstruction,
      }
    });

    return response.text;
  } catch (error) {
    console.error('Gemini API Error in chat:', error);
    throw error;
  }
}

export async function analyzeBookImage(base64Image: string, mimeType: string) {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType,
              },
            },
            {
              text: 'Analyze this image of a book (could be the cover, spine, or a page). Identify the book. Return the best guess for the title, author, and an array of up to 5 keywords describing the category/genre. If you cannot identify any book, set "identified" to false. Format your response strictly as JSON.',
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            identified: {
              type: Type.BOOLEAN,
              description: 'Whether a book was successfully identified from the image.',
            },
            title: {
              type: Type.STRING,
              description: 'The title of the book, if identified.',
            },
            author: {
              type: Type.STRING,
              description: 'The author of the book, if identified.',
            },
            keywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Keywords related to the book.',
            },
          },
          required: ['identified'],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

export async function chatWithLibrarian(history: Content[], userMessage: string, availableBooksContext: string = "") {
  try {
    const ai = getAiClient();
    const systemInstruction = `You are a helpful and knowledgeable library AI assistant.
    You assist students in finding books, recommending readings based on their interests, and answering questions about the library catalog.
    Be concise, friendly, and format your answers with clean formatting (bullet points, bold text).
    Always use the 'searchLibraryDatabase' tool when a user asks about a specific book, or asks for recommendations, or asks about book availability.
    If asked about available books, you can also refer to the following catalog context if available:
    ${availableBooksContext}`;

    const searchLibraryDatabase: FunctionDeclaration = {
      name: "searchLibraryDatabase",
      description: "Search the library catalog for books matching a keyword in their title, author, or category. Returns an array of matching books with details like availability, quantity, and ISBN.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          keyword: {
            type: Type.STRING,
            description: "The keyword to search for (e.g., 'Harry Potter', 'Fiction', 'Rowling')."
          }
        },
        required: ["keyword"]
      }
    };

    let allContents: any[] = [
      ...history,
      { role: 'user', parts: [{ text: userMessage }] }
    ];

    let response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: allContents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [searchLibraryDatabase] }],
      }
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      if (call.name === "searchLibraryDatabase") {
        const keyword = (call.args as any).keyword?.toLowerCase() || "";
        let searchResults: any[] = [];
        try {
          const snap = await getDocs(collection(db, 'books'));
          searchResults = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((book: any) => 
               book.title?.toLowerCase().includes(keyword) || 
               book.author?.toLowerCase().includes(keyword) || 
               book.category?.toLowerCase().includes(keyword)
            ).slice(0, 10); // return up to 10 results to not blow up context
        } catch (err: any) {
          console.error("Error searching DB:", err);
          searchResults = [{ error: "Failed to search database", details: err.message }];
        }

        // append assistant's call and our tool response to the history
        allContents.push(response.candidates?.[0]?.content);
        allContents.push({
          role: 'user',
          parts: [{
            functionResponse: {
              name: "searchLibraryDatabase",
              response: { results: searchResults }
            }
          }]
        });

        // call again
        response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: allContents,
          config: {
            systemInstruction,
            tools: [{ functionDeclarations: [searchLibraryDatabase] }],
          }
        });
      }
    }

    return response.text;
  } catch (error) {
    console.error('Gemini API Error in librarian chat:', error);
    throw error;
  }
}
