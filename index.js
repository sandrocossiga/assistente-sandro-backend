const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const fs = require('fs');
const https = require('https');
require('dotenv').config();

const ffmpegPath = require('ffmpeg-static');        // Trova il percorso del binario ffmpeg statico
const ffmpeg = require('fluent-ffmpeg');            // Libreria wrapper per ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);                   // Collega il binario statico a fluent-ffmpeg



const app = express();
app.use(bodyParser.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const TELEGRAM_FILE_API = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}`;

app.post('/webhook', async (req, res) => {
  const message = req.body.message;

  if (!message) return res.sendStatus(200);

  const chatId = message.chat.id;

  // Caso: messaggio vocale
  if (message.voice) {
    const fileId = message.voice.file_id;

    try {
      // Recupera info sul file
      const fileInfo = await axios.get(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
      const filePath = fileInfo.data.result.file_path;

      // Scarica il file
      const fileUrl = `${TELEGRAM_FILE_API}/${filePath}`;
      const fileName = `audio_${Date.now()}.ogg`;

      const file = fs.createWriteStream(fileName);
      https.get(fileUrl, (response) => {
        response.pipe(file);
        file.on('finish', async () => {
          file.close();
          console.log(`🎙️ Audio scaricato: ${fileName}`);
          // 🔁 Prossimo step: convertire in testo
          await sendMessage(chatId, `Audio ricevuto! Ora lo trascrivo...`);
        });
      });
    } catch (err) {
      console.error('Errore nel download:', err);
      await sendMessage(chatId, '⚠️ Errore nel download dell’audio.');
    }
  }

  // Caso: messaggio testuale
  if (message.text) {
    await sendMessage(chatId, `Hai scritto: ${message.text}`);
  }

  res.sendStatus(200);
});

async function sendMessage(chatId, text) {
  await axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: chatId,
    text: text
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server Telegram attivo sulla porta ${PORT}`);
});
