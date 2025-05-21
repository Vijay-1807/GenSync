import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

console.log("Gemini API key:", API_KEY);

if (!API_KEY) {
  console.error("Gemini API key not found. Please set REACT_APP_GEMINI_API_KEY in your .env file.");
  // Optionally: throw new Error("API key missing");
}

// Removed internal conversationHistory as it will be managed by the calling component
// let conversationHistory = [];

// Removed resetConversation as it will be managed by the calling component
// export function resetConversation() {
//   conversationHistory = [];
// }

// Initialize the API
const genAI = new GoogleGenerativeAI(API_KEY);

// Removed getAvailableModels as we are now targeting a specific model
// async function getAvailableModels() { ... }

export async function getGeminiReply(userMessage, history) {
  try {
    // Use the history provided by the calling component
    const conversation = [...history, { role: "user", parts: [{ text: userMessage }] }];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: conversation,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("API Error Response:", errorData);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      // Check if there are prompt feedback issues
      if (data.promptFeedback && data.promptFeedback.blockReason) {
        console.warn("Prompt blocked:", data.promptFeedback);
        return "My apologies, I couldn't generate a response for that query due to safety concerns.";
      }
      throw new Error("No response generated from Gemini");
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    
    // Removed adding to internal history
    // conversationHistory.push({ ... });

    // Removed history trimming
    // if (conversationHistory.length > 10) { ... }

    return generatedText || "I apologize, but I couldn't generate a proper response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I apologize, but I'm having trouble connecting to the Gemini service right now. Please try again later.";
  }
}

// Remove the temporary console test line
// getGeminiReply("Hello Gemini").then(console.log); 