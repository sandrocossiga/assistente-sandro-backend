// index.js const express = require('express'); const axios = require('axios'); const bodyParser = require('body-parser'); const fs = require('fs'); const https = require('https'); require('dotenv').config();

const ffmpegPath = require('ffmpeg-static'); const ffmpeg = require('fluent-ffmpeg'); ffmpeg.setFfmpegPath(ffmpegPath);

const { google } = require('googleapis'); const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: [ 'https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/gmail.send' ] });

const driveService = google.drive({ version: 'v3', auth }); const gmail = google.gmail({ version: 'v1', auth });

const app = express(); app.use(bodyParser.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN; const TELEGRAM_API = https://api.telegram.org/bot${TELEGRAM_TOKEN}; const TELEGRAM_FILE_API = https://api.telegram.org/file/bot${TELEGRAM_TOKEN};

app.post('/webhook', async (req, res) => { const message = req.body.message; if (!message) return res.sendStatus(200);

const chatId = message.chat.id;

if (message.voice) { const fileId = message.voice.file_id; try { const fileInfo = await axios.get(${TELEGRAM_API}/getFile?file_id=${fileId}); const filePath = fileInfo.data.result.file_path; const fileUrl = ${TELEGRAM_FILE_API}/${filePath}; const oggPath = audio_${Date.now()}.ogg; const wavPath = oggPath.replace('.ogg', '.wav');

const oggFile = fs.createWriteStream(oggPath);
  https.get(fileUrl, (response) => {
    response.pipe(oggFile);
    oggFile.on('finish', async () => {
      oggFile.close();

      ffmpeg(oggPath)
        .toFormat('wav')
        .on('error', (err) => {
          console.error('Errore conversione ffmpeg:', err.message);
          sendMessage(chatId, '❌ Errore nella conversione audio.');
        })
        .on('end', async () => {
          console.log(`🎧 Conversione completata: ${wavPath}`);
          const speech = require('@google-cloud/speech').v1;
          const client = new speech.SpeechClient();
          const audioBytes = fs.readFileSync(wavPath).toString('base64');

          const request = {
            audio: { content: audioBytes },
            config: {
              encoding: 'LINEAR16',
              sampleRateHertz: 48000,
              languageCode: 'it-IT'
            }
          };

          try {
            const [response] = await client.recognize(request);
            const transcription = response.results.map(r => r.alternatives[0].transcript).join('\n');

            if (transcription) {
              await sendMessage(chatId, `📝 Hai detto:\n${transcription}`);
              const geminiResponse = await axios.post(
                'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent',
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
            } else {
              await sendMessage(chatId, '⚠️ Nessuna trascrizione trovata da Google.');
            }

          } catch (sttErr) {
            console.error('❌ Errore Google STT:', sttErr.message);
            await sendMessage(chatId, '⚠️ Errore nella trascrizione vocale.');
          }

          fs.unlinkSync(oggPath);
          fs.unlinkSync(wavPath);
        })
        .save(wavPath);
    });
  });
} catch (err) {
  console.error('Errore nel download audio:', err.message);
  await sendMessage(chatId, '⚠️ Errore nel download dell’audio.');
}

}

if (message.text) { const testo = message.text.toLowerCase();

if (testo.startsWith("invia email a")) {
  const emailRegex = /invia email a (.+?) con oggetto (.+?) e testo (.+)/i;
  const match = testo.match(emailRegex);

  if (match) {
    const destinatario = match[1].trim();
    const oggetto = match[2].trim();
    const corpo = match[3].trim();

    try {
      const encodedMessage = Buffer.from(
        `To: ${destinatario}\r\nSubject: ${oggetto}\r\n\r\n${corpo}`
      ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });

      await sendMessage(chatId, `✅ Email inviata con successo a ${destinatario}`);
    } catch (err) {
      console.error("❌ Errore invio email:", err.message);
      await sendMessage(chatId, "⚠️ Errore durante l'invio dell'email.");
    }
  } else {
    await sendMessage(chatId, "⚠️ Formato email non valido. Usa:\ninvia email a [destinatario] con oggetto [oggetto] e testo [testo]");
  }

  return res.sendStatus(200);
}

if (testo.includes("crea documento google chiamato")) {
  const match = message.text.match(/crea documento google chiamato (.+)/i);
  const titoloDocumento = match ? match[1].trim() : "Documento senza nome";

  const fileMetadata = {
    name: titoloDocumento,
    mimeType: 'application/vnd.google-apps.document'
  };

  try {
    const file = await driveService.files.create({
      resource: fileMetadata,
      fields: 'id'
    });

    await driveService.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'writer',
        type: 'user',
        emailAddress: 'sandrocossiga@gmail.com'
      }
    });

    await sendMessage(chatId, `✅ Documento Google creato con successo: "${titoloDocumento}"\n📎 [Aprilo qui](https://docs.google.com/document/d/${file.data.id}/edit)`);
  } catch (error) {
    console.error("❌ Errore Google Drive:", error.message);
    await sendMessage(chatId, "⚠️ Errore nella creazione del documento.");
  }

  return res.sendStatus(200);
}

const userMessage = message.text;
const now = new Date().toLocaleString('it-IT', {
  timeZone: 'Europe/Rome',
  dateStyle: 'full',
  timeStyle: 'short'
});

try {
  const geminiResponse = await axios.post(
    'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent',
    {
      contents: [{
        parts: [
          { text: `Oggi è ${now}. Rispondi in modo aggiornato e preciso.` },
          { text: userMessage }
        ]
      }]
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY
      }
    }
  );

  const reply = geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || '🤖 Nessuna risposta ricevuta da Gemini.';
  await sendMessage(chatId, reply);
} catch (geminiErr) {
  console.error('❌ Errore Gemini (testo):', geminiErr.response?.data || geminiErr.message);
  await sendMessage(chatId, '⚠️ Errore durante la risposta dell’assistente AI.');
}

return res.sendStatus(200);

} });

async function sendMessage(chatId, text) { await axios.post(${TELEGRAM_API}/sendMessage, { chat_id: chatId, text: text }); }

const PORT = process.env.PORT || 3000; app.listen(PORT, () => { console.log(✅ Server Telegram attivo sulla porta ${PORT}); });

  
