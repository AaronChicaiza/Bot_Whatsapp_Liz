const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

const TOKEN = process.env.TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// Guardar estados de usuarios
const usuarios = {};

// ===============================
// VERIFICACIÓN WEBHOOK META
// ===============================
app.get("/webhook", (req, res) => {

    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token === VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }

});

// ===============================
// RECIBIR MENSAJES
// ===============================
app.post("/webhook", async (req, res) => {

    try {

        const body = req.body;

        if (body.entry) {

            const mensaje =
                body.entry[0].changes[0].value.messages?.[0];

            if (mensaje) {

                const from = mensaje.from;
                const texto = mensaje.text?.body?.toLowerCase().trim();

                let respuesta = "";

                // Crear usuario si no existe
                if (!usuarios[from]) {
                    usuarios[from] = {
                        estado: "inicio"
                    };
                }

                const estado = usuarios[from].estado;

                // =====================================
                // REINICIAR CONVERSACIÓN
                // =====================================
                if (
                    texto === "hola" ||
                    texto === "menu" ||
                    texto === "menú" ||
                    texto === "buenas" ||
                    texto === "información" ||
                    texto === "info"
                ) {

                    usuarios[from].estado = "menu";

                    respuesta =
`👋 Hola, estás comunicándote al número de Lizkarito👑

Coméntame cómo puedo ayudarte hoy 😊

1️⃣ Necesito un video publicitario para mi negocio

2️⃣ Necesito un paquete de videos publicitarios para mi negocio

3️⃣ Necesito conversar personalmente con un asesor para promocionar y hacer crecer mi negocio`;

                }

                // =====================================
                // OPCIÓN 1
                // =====================================
                else if (texto === "1") {

                    usuarios[from].estado = "opcion1_ubicacion";

                    respuesta =
`Perfecto 😊

Coménteme dónde están ubicados y qué necesitan promocionar.`;

                }

                // =====================================
                // RESPUESTA UBICACIÓN OPCIÓN 1
                // =====================================
                else if (estado === "opcion1_ubicacion") {

                    usuarios[from].ubicacion = texto;
                    usuarios[from].estado = "opcion1_horario";

                    respuesta =
`Excelente 👌

¿Cuál es su horario de atención?`;

                }

                // =====================================
                // RESPUESTA HORARIO OPCIÓN 1
                // =====================================
                else if (estado === "opcion1_horario") {

                    usuarios[from].horario = texto;
                    usuarios[from].estado = "finalizado";

                    respuesta =
`Muchas gracias 😊

De inmediato se procederá a enviar los horarios disponibles para poder grabar.

En breve un asesor continuará con su atención personalizada.`;

                }

                // =====================================
                // OPCIÓN 2
                // =====================================
                else if (texto === "2") {

                    usuarios[from].estado = "opcion2_respuesta";

                    respuesta =
`Perfecto 😊

Coménteme dónde están ubicados y qué necesitan promocionar.`;

                }

                // =====================================
                // RESPUESTA OPCIÓN 2
                // =====================================
                else if (estado === "opcion2_respuesta") {

                    usuarios[from].respuesta = texto;
                    usuarios[from].estado = "finalizado";

                    respuesta =
`Muchas gracias 😊

En breve un asesor continuará con su atención personalizada para brindarle toda la información necesaria.`;

                }

                // =====================================
                // OPCIÓN 3
                // =====================================
                else if (texto === "3") {

                    usuarios[from].estado = "finalizado";

                    respuesta =
`😊 Nos interesa mucho conocer sus inquietudes.

De inmediato una persona contestará su requerimiento.

Si prefiere también puede comunicarse directamente a este número 📞`;

                }

                // =====================================
                // SI YA FINALIZÓ → NO RESPONDER MÁS
                // =====================================
                else if (estado === "finalizado") {

                    return res.sendStatus(200);

                }

                // =====================================
                // MENSAJE NO RECONOCIDO
                // =====================================
                else {

                    respuesta =
`😊 Disculpe, no logré entender su mensaje.

Por favor escriba:

1️⃣ Video publicitario

2️⃣ Paquete de videos publicitarios

3️⃣ Hablar con un asesor`;

                }

                // =====================================
                // ENVIAR MENSAJE
                // =====================================
                await axios({
                    method: "POST",
                    url: `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
                    headers: {
                        Authorization: `Bearer ${TOKEN}`,
                        "Content-Type": "application/json"
                    },
                    data: {
                        messaging_product: "whatsapp",
                        to: from,
                        text: {
                            body: respuesta
                        }
                    }
                });

            }

        }

        res.sendStatus(200);

    } catch (error) {

        console.log(error.response?.data || error.message);
        res.sendStatus(500);

    }

});

// ===============================
// SERVIDOR
// ===============================
app.listen(3000, () => {
    console.log("🚀 Bot funcionando en puerto 3000");
});