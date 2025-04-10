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
  const systemMessage = process.env.SYSTEM_MESSAGE || "Sei un assistente professionale.";

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = response.data.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error('Errore durante la chiamata a OpenAI:', error.message);
    res.status(500).json({ error: 'Errore durante la risposta GPT.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Assistente Sandro backend attivo su porta ${PORT}`);
});
