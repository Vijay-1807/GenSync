import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Gemini API key not found. Make sure you have a .env file with REACT_APP_GEMINI_API_KEY=YOUR_KEY");
  process.exit(1); // Exit if key is missing
}

const genAI = new GoogleGenerativeAI(API_KEY);

async function listAvailableModels() {
  console.log("Listing available models...");
  try {
    const { models } = await genAI.listModels();

    for (const model of models) {
      console.log(`Model: ${model.name}`);
      console.log(`  Supported Methods: ${model.supportedGenerationMethods}`);
      console.log('--');
    }
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listAvailableModels(); 