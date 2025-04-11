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
  res.send('✅ Assistente Sandro con Claude è attivo');
});

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;
  const apiKey = process.env.CLAUDE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Chiave API Claude mancante' });
  }

  console.log("📩 Messaggio ricevuto:", userMessage);

  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: "claude-3-sonnet-20240229",
        max_tokens: 1024,
        messages: [
          { role: "user", content: userMessage }
        ]
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      }
    );

    const reply = response.data.content?.[0]?.text || '⚠️ Nessuna risposta da Claude';
    console.log("🤖 Risposta Claude:", reply);
    res.json({ reply });
  } catch (error) {
    console.error("❌ Errore Claude:", error.response?.data || error.message);
    res.status(500).json({ error: 'Errore nella risposta di Claude' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server attivo su porta ${PORT}`);
});
