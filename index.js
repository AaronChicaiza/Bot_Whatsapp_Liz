const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();

app.use(express.json());

const TOKEN = process.env.TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// ===============================
// GUARDAR ESTADOS DE USUARIOS
// ===============================
const usuarios = {};

// ===============================
// VERIFICAR WEBHOOK META
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

                // ===============================
                // CREAR USUARIO SI NO EXISTE
                // ===============================
                if (!usuarios[from]) {

                    usuarios[from] = {
                        estado: "inicio"
                    };

                }

                const estado = usuarios[from].estado;

                // ===============================
                // MENÚ PRINCIPAL
                // ===============================
                if (
                    texto === "hola" ||
                    texto === "buenas" ||
                    texto === "info" ||
                    texto === "información"
                ) {

                    usuarios[from].estado = "menu";

                    respuesta =
`✨ ¡Holaa! Qué gusto tenerte por aquí 💖

Estás comunicándote con Lizkarito👑 tu aliada en hacer crecer tu marca y cumplir tus objetivos comerciales 👀✨

Coméntame cómo puedo ayudarte hoy 😊

1️⃣ Necesito un video publicitario para mi negocio

2️⃣ Necesito un paquete de videos publicitarios para mi negocio

3️⃣ Necesito conversar personalmente con un asesor para promocionar y hacer crecer mi negocio`;

                }

                // ===============================
                // OPCIÓN 1
                // ===============================
                else if (estado === "menu" && texto === "1") {

                    usuarios[from].estado = "opcion1_paso1";

                    respuesta =
`Cuéntame un poquito de tu marca o negocio 🤍

¿Qué te gustaría impulsar en TikTok o Instagram?

Me encantaría conocerte y ver cómo podemos hacer que más personas descubran lo que haces 🚀`;

                }

                // ===============================
                // OPCIÓN 2
                // ===============================
                else if (estado === "menu" && texto === "2") {

                    usuarios[from].estado = "opcion2_paso1";

                    respuesta =
`Cuéntame un poquito de tu marca o negocio 🤍

¿Qué te gustaría impulsar en TikTok o Instagram?

Me encantaría conocerte y ver cómo podemos hacer que más personas descubran lo que haces 🚀`;

                }

                // ===============================
                // OPCIÓN 3
                // ===============================
                else if (estado === "menu" && texto === "3") {

                    usuarios[from].estado = "finalizado";

                    respuesta =
`¡Increíble! 🙌🏼

En pocos minutos un asesor se pondrá en contacto contigo 💖

O si prefieres y necesitas información inmediata puedes llamar sin problema a este número 😊📞📲`;

                }

                // ===============================
                // RESPUESTA PASO 1 OPCIÓN 1
                // ===============================
                else if (estado === "opcion1_paso1") {

                    usuarios[from].info_negocio = texto;

                    usuarios[from].estado = "opcion1_paso2";

                    respuesta =
`¡Qué emocionante! 😍

Definitivamente las redes pueden ayudarte muchísimo a atraer más clientes y darle más visibilidad a tu negocio ✨

Para poder recomendarte la mejor estrategia, cuéntame un poquito más 👀👇

• ¿Qué tipo de negocio o emprendimiento tienes?
• ¿En qué ciudad estás ubicado?
• ¿Qué te gustaría lograr con la publicidad?
• ¿Te interesa TikTok, Instagram o ambas plataformas?

Con eso ya puedo orientarte mucho mejor 🤍`;

                }

                // ===============================
                // RESPUESTA FINAL OPCIÓN 1
                // ===============================
                else if (estado === "opcion1_paso2") {

                    usuarios[from].detalles = texto;

                    usuarios[from].estado = "finalizado";

                    respuesta =
`¡Súper! ✨ Gracias por contarme más sobre tu negocio 🤍

Con lo que me comentas, sí veo muchísimo potencial para crear contenido que llame la atención y haga que más personas quieran visitarte/comprarte 👀🔥

En un momento te voy a compartir toda la información sobre paquetes, métricas y opciones de colaboración 💖

Estoy segura de que podemos hacer contenido súper viral para tu marca 🚀`;

                }

                // ===============================
                // RESPUESTA FINAL OPCIÓN 2
                // ===============================
                else if (estado === "opcion2_paso1") {

                    usuarios[from].respuesta = texto;

                    usuarios[from].estado = "finalizado";

                    respuesta =
`¡Súper! ✨ Gracias por contarme más sobre tu negocio 🤍

Con lo que me comentas, sí veo muchísimo potencial para crear contenido que llame la atención y haga que más personas quieran visitarte/comprarte 👀🔥

En un momento te voy a compartir toda la información sobre paquetes, métricas y opciones de colaboración 💖

Estoy segura de que podemos hacer contenido súper viral para tu marca 🚀`;

                }

                // ===============================
                // CONVERSACIÓN FINALIZADA
                // ===============================
                else if (estado === "finalizado") {

                    return res.sendStatus(200);

                }

                // ===============================
                // MENSAJE NO RECONOCIDO
                // ===============================
                else {

                    respuesta =
`💖 Perdón, no logré entender tu mensaje.

Por favor selecciona una opción escribiendo:

1️⃣ Video publicitario

2️⃣ Paquete de videos publicitarios

3️⃣ Hablar con un asesor`;

                }

                // ===============================
                // ENVIAR MENSAJE WHATSAPP
                // ===============================
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