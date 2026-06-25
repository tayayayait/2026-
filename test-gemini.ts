import { generateGeminiReport } from "./src/integrations/gemini/client.js";
import "dotenv/config"; // if using dotenv

async function test() {
  try {
    const res = await generateGeminiReport("You are an agricultural expert.", "Create a report for a farm.");
    console.log("Success:", res);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
