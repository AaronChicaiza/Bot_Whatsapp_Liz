const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

const TOKEN = process.env.TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// Estructura temporal en memoria para controlar los estados
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
// RECIBIR MENSAJES Y ESTADOS
// ===============================
app.post("/webhook", async (req, res) => {
    try {
        const body = req.body;
        if (!body.entry) return res.sendStatus(200);

        const value = body.entry[0].changes[0].value;

        // 🚨 FILTRO 1: Ignorar eventos de "statuses" (Entregado, Leído, Enviado del negocio)
        if (value.statuses) {
            return res.sendStatus(200); 
        }

        const mensaje = value.messages?.[0];
        
        // Procesar solo mensajes de texto entrantes
        if (mensaje && mensaje.type === "text") {
            const from = mensaje.from;
            const texto = mensaje.text.body ? mensaje.text.body.toLowerCase().trim() : "";
            
            // 🚨 FILTRO 2: Evitar procesar mensajes viejos o bucles por reintentos de Meta
            const timestampMensaje = parseInt(mensaje.timestamp) * 1000; // Meta lo envía en segundos, JS usa milisegundos
            const tiempoActual = Date.now();
            const diferenciaMinutos = (tiempoActual - timestampMensaje) / 1000 / 60;

            // Si el mensaje tiene más de 2 minutos de antigüedad, lo ignoramos de forma segura
            if (diferenciaMinutos > 2) {
                console.log(`⚠️ Mensaje de ${from} ignorado: llegó con ${Math.round(diferenciaMinutos)} min de retraso (Reintento de Meta).`);
                return res.sendStatus(200); 
            }

            // 🚨 FILTRO 3: Validar que el texto no venga vacío por algún error de payload
            if (!texto) {
                return res.sendStatus(200);
            }

            // Inicializar el usuario si escribe por primera vez
            if (!usuarios[from]) {
                usuarios[from] = { estado: "inicio" };
            }

            const estado = usuarios[from].estado;

            // 🌟 COMANDO SECRETO DESDE EL CELULAR PARA RE-ACTIVAR EL BOT:
            if (texto === ".bot" || texto === "volver al menu") {
                usuarios[from].estado = "menu";
                respuesta = `🤖 *Asistente Virtual Reactivado*\n\nEscribe *"hola"* para desplegar el menú de opciones.`;
                await enviarMensajeWhatsApp(from, respuesta);
                return res.sendStatus(200);
            }

            // ==========================================
            // LÓGICA DEL FLUJO DE ESTADOS
            // ==========================================
            let respuesta = "";

            // ESTADO HUMANO (El bot se calla por completo para permitir chat manual en WhatsApp Business)
            if (estado === "humano") {
                if (texto === "menu") {
                    usuarios[from].estado = "menu";
                    respuesta = obtenerTextoMenu();
                    await enviarMensajeWhatsApp(from, respuesta);
                    return res.sendStatus(200);
                } else {
                    return res.sendStatus(200); // Ignora silenciosamente para no interrumpir al humano
                }
            }

            // MENÚ PRINCIPAL / SALUDO INICIAL
            else if (
                estado === "inicio" || 
                texto.includes("hola") ||
                texto.includes("holaa") ||
                texto.includes("buenas") ||
                texto.includes("info") ||
                texto.includes("información")
            ) {
                usuarios[from].estado = "menu";
                respuesta = obtenerTextoMenuInicio();
            }

            // OPCIÓN 1
            else if (estado === "menu" && texto === "1") {
                usuarios[from].estado = "opcion1_paso1";
                respuesta = `Cuéntame un poquito de tu marca o negocio 🤍\n\n¿Qué te gustaría impulsar en TikTok o Instagram?\n\nMe encantaría conocerte y ver cómo podemos hacer que más personas descubran lo que haces 🚀`;
            }

            // OPCIÓN 2
            else if (estado === "menu" && texto === "2") {
                usuarios[from].estado = "opcion2_paso1";
                respuesta = `Cuéntame un poquito de tu marca o negocio 🤍\n\n¿Qué te gustaría impulsar en TikTok o Instagram?\n\nMe encantaría conocerte y ver cómo podemos hacer que más personas descubran lo que haces 🚀`;
            }

            // OPCIÓN 3 (Traspaso planificado)
            else if (estado === "menu" && texto === "3") {
                usuarios[from].estado = "finalizado";
                respuesta = `¡Increíble! 🙌🏼\n\nEn pocos minutos un asesor se pondrá en contacto contigo 💖\n\nEscribe *"finalizar"* para terminar y te atenderá directamente una persona real 📲`;
            }

            // RESPUESTA PASO 1 OPCIÓN 1
            else if (estado === "opcion1_paso1") {
                usuarios[from].info_negocio = texto;
                usuarios[from].estado = "opcion1_paso2";
                respuesta = `¡Qué emocionante! 😍\n\nDefinitivamente las redes pueden ayudarte muchísimo a atraer más clientes y darle más visibilidad a tu negocio ✨\n\nPara poder recomendarte la mejor estrategia, cuéntame un poquito más 👀👇\n\n• ¿Qué tipo de negocio o emprendimiento tienes?\n• ¿En qué ciudad estás ubicado?\n• ¿Qué te gustaría lograr con la publicidad?\n• ¿Te interesa TikTok, Instagram o ambas plataformas?\n\nCuando termines de contarme, escribe *"listo"* para cerrar 🤍`;
            }

            // RESPUESTA OPCIÓN 1 PASO 2
            else if (estado === "opcion1_paso2") {
                if (texto === "listo" || texto === "terminar") {
                    usuarios[from].estado = "finalizado";
                    respuesta = obtenerTextoFinalizacion();
                } else {
                    if (!usuarios[from].detalles) usuarios[from].detalles = [];
                    usuarios[from].detalles.push(texto);
                    respuesta = `Perfecto, anotado 🤍. ¿Quieres agregar algo más? Si ya terminaste, escribe *"listo"*.`;
                }
            }

            // RESPUESTA FINAL OPCIÓN 2
            else if (estado === "opcion2_paso1") {
                usuarios[from].respuesta = texto;
                usuarios[from].estado = "finalizado";
                respuesta = obtenerTextoFinalizacion();
            }

            // CONVERSACIÓN FINALIZADA -> TRANSFERENCIA A HUMANO
            else if (estado === "finalizado") {
                if (texto === "finalizar") {
                    respuesta = `✅ Perfecto, gracias por su paciencia, en breve un asesor se pondrá en contacto contigo para ayudarte a hacer crecer tu negocio 🚀`;
                    usuarios[from].estado = "humano"; // 🚨 Aquí el bot se apaga para este usuario
                } else {
                    respuesta = `💖 La conversación anterior ya terminó.\n\nPor favor escriba *"finalizar"*.`;
                }
            }

            // MENSAJE NO RECONOCIDO
            else {
                respuesta = `💖 Perdón, no logré entender tu mensaje.\n\nPor favor selecciona una opción escribiendo el número:\n\n1️⃣ Video publicitario\n2️⃣ Paquete de videos publicitarios\n3️⃣ Hablar con un asesor`;
            }

            // ENVIAR LA RESPUESTA
            if (respuesta) {
                await enviarMensajeWhatsApp(from, respuesta);
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.log(error.response?.data || error.message);
        res.sendStatus(500);
    }
});

// ===============================
// COMPONENTES DE TEXTO REUTILIZABLES
// ===============================
function obtenerTextoMenu() {
    return `✨ ¡Bienvenido de nuevo! 💖\n\nComéntame cómo puedo ayudarte hoy 😊\n\n1️⃣ Necesito un video publicitario para mi negocio\n2️⃣ Necesito un paquete de videos publicitarios para mi negocio\n3️⃣ Necesito conversar personalmente con un asesor para promocionar y hacer crecer mi negocio`;
}

function obtenerTextoMenuInicio() {
    return `✨ ¡Holaa! Qué gusto tenerte por aquí 💖\n\nEstás comunicándote con Lizkarito👑 tu aliada en hacer crecer tu marca y cumplir tus objetivos comerciales 👀✨\n\nComéntame cómo puedo ayudarte hoy 😊\n\n1️⃣ Necesito un video publicitario para mi negocio\n2️⃣ Necesito un paquete de videos publicitarios para mi negocio\n3️⃣ Necesito conversar personalmente con un asesor para promocionar y hacer crecer mi negocio`;
}

function obtenerTextoFinalizacion() {
    return `¡Súper! ✨ Gracias por contarme más sobre tu negocio 🤍\n\nCon lo que me comentas, sí veo muchísimo potencial para crear contenido que llame la atención y haga que más personas quieran visitarte/comprarte 👀🔥\n\nEn un momento te voy a compartir toda la información sobre paquetes, métricas y opciones de colaboración 💖\n\nEstoy segura de que podemos hacer contenido súper viral para tu marca 🚀\n\nEscribe *"finalizar"* para terminar y te atenderá directamente una persona real 📲`;
}

// ===============================
// FUNCIÓN UNIFICADA DE ENVÍO AXIOS
// ===============================
async function enviarMensajeWhatsApp(to, body) {
    await axios({
        method: "POST",
        url: `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
        headers: {
            Authorization: `Bearer ${TOKEN}`,
            "Content-Type": "application/json"
        },
        data: {
            messaging_product: "whatsapp",
            to: to,
            text: { body: body }
        }
    });
}

// ===============================
// INICIAR SERVIDOR
// ===============================
app.listen(3000, () => {
    console.log("🚀 Servidor corriendo en puerto 3000 con protección de reintentos Meta.");
});