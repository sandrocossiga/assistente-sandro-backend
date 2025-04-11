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

if (message.voice) {
  const fileId = message.voice.file_id;
  const chatId = message.chat.id;

  try {
    // 🔁 Recupera info sul file audio
    const fileInfo = await axios.get(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
    const filePath = fileInfo.data.result.file_path;
    const fileUrl = `${TELEGRAM_FILE_API}/${filePath}`;

    const oggPath = `audio_${Date.now()}.ogg`;
    const wavPath = oggPath.replace('.ogg', '.wav');

    // 🔽 Scarica il file ogg
    const oggFile = fs.createWriteStream(oggPath);
    https.get(fileUrl, (response) => {
      response.pipe(oggFile);
      oggFile.on('finish', async () => {
        oggFile.close();

        // 🔄 Converte in wav
        ffmpeg(oggPath)
          .toFormat('wav')
          .on('error', (err) => {
            console.error('Errore conversione ffmpeg:', err.message);
            sendMessage(chatId, '❌ Errore nella conversione audio.');
          })
          .on('end', async () => {
            console.log(`🎧 Conversione completata: ${wavPath}`);

            // 🔁 Invia a Google STT
            const speech = require('@google-cloud/speech').v1;
            const client = new speech.SpeechClient();

            const audioBytes = fs.readFileSync(wavPath).toString('base64');
            const audio = { content: audioBytes };
            const config = {
              encoding: 'LINEAR16',
              sampleRateHertz: 48000,
              languageCode: 'it-IT',
            };

            const request = { audio, config };

            try {
              const [response] = await client.recognize(request);
              const transcription = response.results
                .map(result => result.alternatives[0].transcript)
                .join('\n');
              
            if (transcription) {
  await sendMessage(chatId, `📝 Hai detto:\n${transcription}`);

  try {
    const geminiResponse = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      {
        contents: [{ parts: [{ text: transcription }] }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY
        }
      }
    );

    const reply = geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || '🤖 Nessuna risposta ricevuta da Gemini.';
    await sendMessage(chatId, `💬 Gemini:\n${reply}`);
  } catch (geminiErr) {
    console.error('❌ Errore Gemini:', geminiErr.response?.data || geminiErr.message);
    await sendMessage(chatId, '⚠️ Errore durante la risposta dell’assistente AI.');
  }
} else {
  await sendMessage(chatId, '⚠️ Nessuna trascrizione trovata da Google.');
}


              
            } catch (sttError) {
              console.error('❌ Errore Google STT:', sttError.message);
              await sendMessage(chatId, '⚠️ Errore nella trascrizione vocale.');
            }

            // 🧹 Pulisce file
            fs.unlinkSync(oggPath);
            fs.unlinkSync(wavPath);
          })
          .save(wavPath);
      });
    });
  } catch (err) {
    console.error('Errore nel download audio:', err.message);
    await sendMessage(message.chat.id, '⚠️ Errore nel download dell’audio.');
  }
}


  
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
