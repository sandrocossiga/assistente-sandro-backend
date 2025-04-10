const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Assistente Sandro con Gemini è attivo ✅');
});

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;
  const apiKey = process.env.GEMINI_API_KEY;

  console.log("📩 Messaggio ricevuto:", userMessage);
  console.log("🔐 Chiave API Gemini presente:", apiKey ? "Sì ✅" : "No ❌");

  if (!apiKey) {
    return res.status(500).json({ error: 'Chiave API Gemini mancante' });
  }

  try {
    const geminiResponse = await axios.post(
      'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=' + apiKey,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: userMessage }]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Nessuna risposta da Gemini.';
    console.log("🤖 Risposta Gemini:", reply);
    res.json({ reply });
  } catch (error) {
    console.error("❌ Errore Gemini:", error.response?.data || error.message);
    res.status(500).json({ error: 'Errore nella risposta di Gemini' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Assistente Sandro con Gemini attivo sulla porta ${PORT}`);
});
