import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: 'AIzaSyCmjE7SwMHiqjPgAHrJKPQ7YNmRtunwWMY' });

async function list() {
  try {
    const response = await ai.models.list();
    console.log("Raw Response:");
    console.dir(response, { depth: null });
  } catch (e) {
    console.error(e);
  }
}
list();
