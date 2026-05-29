// index.js
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const usuarios = {}; // memoria temporal de estados por número

// Función para enviar mensajes a WhatsApp
async function enviarMensaje(to, text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error enviando mensaje:", error.response?.data || error.message);
  }
}

// Webhook de recepción
app.post("/webhook", (req, res) => {
  const entry = req.body.entry?.[0];
  const changes = entry?.changes?.[0];
  const message = changes?.value?.messages?.[0];

  if (message) {
    const from = message.from;
    const body = message.text?.body?.trim().toLowerCase();

    if (!usuarios[from]) {
      usuarios[from] = { estado: "menu" };
    }

    const estado = usuarios[from].estado;
    let respuesta = "";

    // Menú principal
    if (estado === "menu") {
      if (body === "1" || body.includes("video publicitario")) {
        respuesta = `Has elegido: Video publicitario 🎬
Si deseas terminar con el bot y hablar con una persona real, escribe "finalizar".`;
        usuarios[from].estado = "opcion1";
      } else if (body === "2" || body.includes("paquete")) {
        respuesta = `Has elegido: Paquete de videos publicitarios 📦
Si deseas terminar con el bot y hablar con una persona real, escribe "finalizar".`;
        usuarios[from].estado = "opcion2";
      } else if (body === "3" || body.includes("asesor")) {
        respuesta = `Has elegido: Hablar con un asesor 👩‍💼
Si deseas terminar con el bot y hablar con una persona real, escribe "finalizar".`;
        usuarios[from].estado = "opcion3";
      } else if (body === "finalizar") {
        respuesta = `✅ Perfecto, ahora te atenderá directamente una persona real.`;
        usuarios[from].estado = "humano";
      } else {
        respuesta = `💖 Perdón, no logré entender tu mensaje.

Por favor selecciona una opción escribiendo:

1️⃣ Video publicitario
2️⃣ Paquete de videos publicitarios
3️⃣ Hablar con un asesor

O escribe "finalizar" para terminar y hablar con una persona real.`;
      }
    }

    // Estados de opciones
    else if (["opcion1", "opcion2", "opcion3"].includes(estado)) {
      if (body === "finalizar") {
        respuesta = `✅ Perfecto, ahora te atenderá directamente una persona real.`;
        usuarios[from].estado = "humano";
      } else {
        respuesta = `💖 Estás en la opción seleccionada.
Recuerda que puedes escribir "finalizar" para terminar y hablar con una persona real.`;
      }
    }

    // Estado humano (no responde más)
    else if (estado === "humano") {
      return res.sendStatus(200); // no envía nada
    }

    if (respuesta) {
      enviarMensaje(from, respuesta);
    }
  }

  res.sendStatus(200);
});

// Verificación del webhook
app.get("/webhook", (req, res) => {
  const verifyToken = process.env.VERIFY_TOKEN;
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === verifyToken) {
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

app.listen(3000, () => {
  console.log("Bot funcionando en puerto 3000");
});
