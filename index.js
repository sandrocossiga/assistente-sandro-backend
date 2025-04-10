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
  res.send('Assistente Sandro backend attivo ✅');
});

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;
  const systemMessage = process.env.SYSTEM_MESSAGE || "Sei un assistente personale professionale.";
  const apiKey = process.env.OPENAI_KEY;

  console.log("📩 Messaggio ricevuto dal frontend:", userMessage);
  console.log("🔑 API key presente:", apiKey ? "Sì ✅" : "No ❌");

  if (!apiKey) {
    console.error("❌ Errore: OPENAI_KEY mancante");
    return res.status(500).json({ error: 'Chiave OpenAI mancante nel backend.' });
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = response.data.choices[0].message.content;
    console.log("🤖 Risposta GPT:", reply);
    res.json({ reply });
  } catch (error) {
    console.error("❌ Errore nella chiamata a GPT:", error.response?.data || error.message);
    res.status(500).json({ error: 'Errore nella chiamata a GPT.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Assistente Sandro backend attivo su porta ${PORT}`);
});
