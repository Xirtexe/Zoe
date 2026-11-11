const {
  Zoe, mode, isViewOnce, toOpus, AudioMetaData, cutMedia, toVideo,
  extractUrl, sendUrl, getBuffer, imageTranslator, stickerToVideo
} = require("../lib/Index");
const { prepareWAMessageMedia, generateWAMessageFromContent } = require("@whiskeysockets/baileys");
const fancy = require("./func/fancy");
let { getString } = require("./func/lang");
let lang = getString("converter");
const config = require("../config");
const { Image } = require("node-webpmux");
const { fileTypeFromBuffer } = require("file-type");
const fs = require("fs");

Zoe({
  pattern: "url",
  fromMe: mode,
  desc: lang.URL_DESC,
  type: "converter",
}, async (m) => {
  const validTypes = ["videoMessage", "imageMessage", "stickerMessage", "audioMessage"];
  if (!validTypes.includes(m.reply_message?.type)) return m.reply(lang.AVIS_ALERT);
  await sendUrl(m, m.reply_message);
});

Zoe({
  pattern: "fancy",
  fromMe: mode,
  desc: lang.FANCY_DESC,
  type: "converter",
}, async (m, match) => {
  if (!match && !m.reply_message?.text) return m.reply(lang.FANCY_ALERT + fancy.list("Text Here", fancy));
  let id = match.match(/\d/g)?.join("");
  try {
    if (!id && !m.reply_message) return m.reply(fancy.list(match, fancy));
    return m.reply(fancy.apply(fancy[parseInt(id) - 1], m.reply_message?.text || match.replace(id, "")));
  } catch {
    return m.reply(lang.NSF);
  }
});

Zoe({
  pattern: "vv",
  fromMe: mode,
  desc: lang.VV_DESC,
  type: "converter",
}, async (m) => {
  if (!m.reply_message) return m.reply(lang.VO_ALERT);
  if (!isViewOnce(m)) return m.reply(lang.NVO_ALERT);
  return m.forwardMessage(m.jid, m.reply_message.data, { readViewOnce: true });
});

Zoe({
  pattern: "ptv",
  fromMe: mode,
  desc: lang.PTV_DESC,
  type: "converter",
}, async (m, _, client) => {
  if (!m.reply_message) return m.reply(lang.V_ALERT);
  if (m.reply_message.type !== "videoMessage") return m.reply(lang.NV_ALERT);
  let media = await m.reply_message.download();
  return client.sendMessage(m.jid, { video: media, mimetype: "video/mp4", ptv: true }, { quoted: m.data });
});

Zoe({
  pattern: "gif",
  fromMe: mode,
  desc: lang.GIF_DESC,
  type: "converter",
}, async (m, match, client) => {
  if (!m.reply_message) return m.reply(lang.V_ALERT);
  if (m.reply_message.type !== "videoMessage") return m.reply(lang.NV_ALERT);
  let media = await m.reply_message.download();
  let msg = { video: media, mimetype: "video/mp4", gifPlayback: true };
  if (match) msg.caption = match;
  return client.sendMessage(m.jid, msg, { quoted: m.data });
});

Zoe({
  pattern: "sticker",
  fromMe: mode,
  desc: lang.STICKER_DESC,
  type: "converter",
}, async (m) => {
  if (!m.reply_message) return m.reply(lang.VI_ALERT);
  let t = m.reply_message;
  if (t.type !== "videoMessage" && t.type !== "imageMessage") return m.reply(lang.NVI_ALERT);
  if (t.type === "videoMessage" && t.msg.videoMessage.seconds > 5) return m.reply(lang.DBV_ALERT);
  let media = await t.download();
  return m.sendSticker(m.jid, media);
});

Zoe({
  pattern: "mp3",
  alias: ["tomp3"],
  fromMe: mode,
  desc: lang.MP3_DESC,
  type: "converter",
}, async (m, _, client) => {
  if (!m.reply_message) return m.reply(lang.AV_ALERT);
  if (!["videoMessage", "audioMessage", "documentMessage"].includes(m.reply_message.type)) return m.reply(lang.NAV_ALERT);
  let buff = await m.reply_message.download();
  const co = config.AUDIO_DATA.split(";");
  let audio = await AudioMetaData(buff, { title: co[0], body: co[1], image: co[2] });
  return client.sendMessage(m.jid, { audio, mimetype: "audio/mpeg" }, { quoted: m.data });
});

Zoe({
  pattern: "wave",
  alias: ["tovoice", "toptt"],
  fromMe: mode,
  desc: lang.MP3_DESC,
  type: "converter",
}, async (m, text) => {
  if (!m.reply_message) return m.reply(lang.AV_ALERT + "\n\n_.wave [99,0,99,0,99,99,0,99,0,99]_");
  if (!["videoMessage", "audioMessage", "documentMessage"].includes(m.reply_message.type)) return m.reply(lang.NAV_ALERT);

  const audioBuffer = await m.reply_message.download();
  const waveformStyles = [
    [99, 0, 99, 0, 99, 99, 0, 99, 0, 99],
    [20, 60, 100, 40, 80, 30, 90, 50, 70, 10],
    [100, 80, 60, 40, 20, 40, 60, 80, 100, 60],
    [10, 30, 50, 70, 90, 70, 50, 30, 10, 50],
    [90, 20, 80, 30, 70, 40, 60, 50, 100, 30],
  ];

  let waveform;
  if (text?.trim()) {
    try {
      waveform = JSON.parse(text.trim());
      if (!Array.isArray(waveform) || waveform.length === 0 || waveform.some((value) => typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100)) {
        return m.reply("*Invalid waveform format.*\n\nUse numbers from 0-100 inside []\nExample:\n.wave [99,0,99,0,99,99,0,99,0,99]");
      }
    } catch {
      return m.reply("*Invalid waveform format.*\n\nUse numbers from 0-100 inside []\nExample:\n.wave [99,0,99,0,99,99,0,99,0,99]");
    }
  } else {
    waveform = waveformStyles[Math.floor(Math.random() * waveformStyles.length)];
  }

  const audio = await toOpus(audioBuffer);
  const audioContents = { audio, mimetype: "audio/ogg; codecs=opus", ptt: true };
  const media = await prepareWAMessageMedia(audioContents, { upload: m.client.waUploadToServer });
  media.audioMessage.waveform = waveform;
  const ms = generateWAMessageFromContent(m.jid, { audioMessage: media.audioMessage }, { userJid: m.client.user.id });
  return await m.client.relayMessage(m.jid, ms.message, {});
});

Zoe({
  pattern: "take",
  fromMe: mode,
  desc: lang.TAKE_DESC,
  type: "converter",
}, async (m, match, c) => {
  if (!m.reply_message) return m.reply(lang.VAS_ALERT);
  let buf = await m.reply_message.download();
  let type = m.reply_message.type;
  let d = (match || (type == "stickerMessage" ? config.STICKER_PACKDATA : config.AUDIO_DATA)).split(";");

  if (["videoMessage", "audioMessage"].includes(type)) {
    try {
      let audio = await AudioMetaData(buf, { title: d[0], body: d[1], image: d[2] });
      return c.sendMessage(m.jid, { audio, mimetype: "audio/mpeg" }, { quoted: m.data });
    } catch {
      return m.reply(lang.F_ALERT);
    }
  } else if (type == "stickerMessage") {
    return m.sendSticker(m.jid, buf, { packname: d[0], author: d[1] });
  }
});

Zoe({
  pattern: "doc",
  fromMe: mode,
  desc: lang.DOC_DESC,
  type: "converter",
}, async (m, x, c) => {
  m.client = c;
  x = (x || "converted media").replace(/[^A-Za-z0-9]/g, "-");
  if (!["videoMessage", "audioMessage", "imageMessage"].includes(m.reply_message?.type)) return m.reply(lang.NAVI_ALERT);
  let b = await m.reply_message.download();
  let { ext: e, mime: f } = await fileTypeFromBuffer(b);
  return c.sendMessage(m.jid, { document: b, mimetype: f, fileName: x + "." + e });
});

Zoe({
  pattern: "trim",
  fromMe: mode,
  desc: lang.TRIM_DESC,
  type: "converter",
}, async (m, match, client) => {
  if (!["audioMessage", "videoMessage"].includes(m.reply_message?.type)) return m.reply(lang.NAV_ALERT);
  if (!match) return m.reply(lang.TM_ALERT);

  try {
    const [startRaw, endRaw] = match.split(",");
    const parseTime = (t) => {
      if (!t) return "0";
      if (t.includes(":")) {
        const [min, sec] = t.split(":").map(Number);
        return String(min * 60 + sec);
      }
      return t.trim();
    };
    const start = parseTime(startRaw);
    const end = parseTime(endRaw);
    const buff = await m.reply_message.download();
    const isAudio = m.reply_message.type === "audioMessage";
    const trimmed = await cutMedia(buff, start, end, isAudio);
    return client.sendMessage(m.jid, isAudio ? { audio: trimmed, mimetype: "audio/mpeg" } : { video: trimmed, mimetype: "video/mp4" });
  } catch (err) {
    return m.reply(lang.F_ALERT);
  }
});

Zoe({
  pattern: "black",
  fromMe: mode,
  desc: lang.BLACK_DESC,
  type: "converter",
}, async (m, match, client) => {
  if (!["audioMessage", "videoMessage"].includes(m.reply_message?.type)) return m.reply(lang.NAV_ALERT);
  try {
    const buff = await m.reply_message.download();
    const blackVid = await toVideo(buff, "mp3");
    return client.sendMessage(m.jid, { video: blackVid, mimetype: "video/mp4" });
  } catch (err) {
    return m.reply(lang.F_ALERT);
  }
});

Zoe({
  pattern: "tovv",
  fromMe: mode,
  desc: lang.TOVV_DESC,
  type: "converter",
}, async (message) => {
  if (!message.reply_message) return message.reply(lang.AVI_ALERT);
  let media = await message.reply_message.download();
  if (!media) return message.reply(lang.F_ALERT);

  let types = {
    imageMessage: ["image", "image/jpeg"],
    videoMessage: ["video", "video/mp4"],
    audioMessage: ["audio", "audio/mpeg"],
  };
  let t = types[message.reply_message.type];
  if (!t) return message.reply(lang.NAVI_ALERT);
  return message.client.sendMessage(message.jid, { [t[0]]: media, mimetype: t[1], viewOnce: true }, { quoted: message.data });
});

Zoe({
  pattern: "toimg",
  fromMe: mode,
  desc: lang.TOIMG_DESC,
  type: "converter",
}, async (message) => {
  if (!message.reply_message) return message.reply(lang.S_ALERT);
  let media = await message.reply_message.download();
  if (!media) return message.reply(lang.F_ALERT);
  if (message.reply_message?.type !== "stickerMessage" || message.reply_message.msg?.stickerMessage?.isAnimated) return message.reply(lang.WNAS_ALERT);
  return message.client.sendMessage(message.jid, { image: media, mimetype: "image/jpeg" }, { quoted: message.data });
});

Zoe({
  pattern: "tomp4",
  fromMe: mode,
  desc: lang.TOMP4_DESC,
  type: "converter",
}, async (message) => {
  if (!message.reply_message) return message.reply("Reply to an animated sticker or audio.");
  let media = await message.reply_message.download();
  if (!media) return message.reply(lang.F_ALERT);
  if (message.reply_message.type === "stickerMessage") {
    try {
      let vd = await stickerToVideo(media);
      if (!vd) throw new Error("Conversion failed");
      return message.sendFromUrl(vd, { quoted: true });
    } catch (error) {
      return message.reply("This is not a valid animated sticker, or the sticker conversion failed.");
    }
  }
  if (message.reply_message.type === "audioMessage") {
    try {
      let vd = await toVideo(media, "mp3");
      if (!vd) throw new Error("Conversion failed");
      return message.client.sendMessage(message.jid, { video: vd, mimetype: "video/mp4" }, { quoted: message.data });
    } catch (error) {
      return message.reply("Audio to video conversion failed.");
    }
  }
  return message.reply("Reply to an animated sticker or audio.");
});

Zoe({
  pattern: "upload",
  fromMe: mode,
  desc: lang.UPLOAD_DESC,
  type: "converter",
}, async (message, match) => {
  const allowed = ["png", "jpg", "jpeg", "mp4", "mp3", "zip", "gif", "webp"];
  const text = match || message.reply_message?.text;
  match = typeof text === "string" ? text.trim().match(/https?:\/\/[^\s]+/i)?.[0] : null;
  if (!match) return message.reply(lang.L_ALERT);
  try {
    const url = new URL(match);
    if (!allowed.includes(url.pathname.split(".").pop().toLowerCase()))
      return message.reply(lang.TFS_ALERT + allowed.join(", "));
    return await message.sendFromUrl(url.href);
  } catch (err) {
    console.error("[UPLOAD]", err);
    return message.reply(lang.F_ALERT);
  }
});

Zoe({
  pattern: "imgtrt",
  fromMe: mode,
  desc: "Translate text inside an image",
  type: "converter",
}, async (m, text) => {
  const SUPPORTED_LANGUAGES = new Set(["en", "ml", "hi", "ta", "te", "kn", "bn", "gu", "mr", "pa", "ur", "ar", "fr", "de", "es", "it", "pt", "ru", "ja", "ko", "zh"]);
  function normalizeLanguage(lang) {
    lang = String(lang || "ml").trim().toLowerCase();
    if (!SUPPORTED_LANGUAGES.has(lang)) throw new Error(`Unsupported language: ${lang}\n\nSupported:\n${[...SUPPORTED_LANGUAGES].join(", ")}`);
    return lang;
  }

  try {
    if (!m.reply_message) return m.reply("Reply to an image with .translate [language]\n\nExample:\n.translate ml\n.translate en\n.translate hi");
    const replied = m.reply_message;
    if (replied.type !== "imageMessage") return m.reply("The replied message must be an image.");
    const targetLang = normalizeLanguage(String(text || "ml").trim().split(/\s+/)[0]);
    const path = await replied.downloadMediaMessage();
    if (!path) return m.reply("Failed to download the replied image.");
    if (fs.statSync(path).size > 15 * 1024 * 1024) return m.reply("Image is too large.\nMaximum allowed size: 15 MB.");

    await m.reply(`Translating image to ${targetLang}...`);
    const result = await imageTranslator(path, targetLang);
    const url = result?.data?.url;
    if (!url) throw new Error("Translation completed but no result URL was returned.");
    await m.client.sendMessage(m.jid, { image: await getBuffer(url), caption: `Image translated\nLanguage: ${targetLang}` }, { quoted: m.data });
  } catch (error) {
    return m.reply(`Image translation failed\n\n${error.message}`);
  }
});

Zoe({
  pattern: "trt",
  alias: ["translate"],
  fromMe: mode,
  desc: "Translate text",
  type: "converter",
}, async (m, text) => {
  try {
    const p = (text || "").trim().split(/\s+/);
    const t = p.shift()?.toLowerCase();
    if (!t) return m.reply("Specify a target language.\n\nExample:\n.trt en hello world");
    const s = p.join(" ").trim() || m.reply_message?.text?.trim();
    if (!s) return m.reply("Provide text or reply to a message.");

    const u = new URL("https://translate.googleapis.com/translate_a/single");
    u.searchParams.set("client", "gtx");
    u.searchParams.set("sl", "auto");
    u.searchParams.set("tl", t);
    u.searchParams.set("dt", "t");
    u.searchParams.set("q", s);
    const r = await fetch(u);
    if (!r.ok) return m.reply(r.status === 429 ? "Rate limited by Google, try again later." : `Translation failed (${r.status}).`);

    const d = await r.json();
    const o = d[0]?.map((x) => x?.[0] || "").join("");
    if (!o) return m.reply("Empty translation response.");
    await m.client.sendMessage(m.jid, { text: o }, { quoted: m.data });
  } catch (e) {
    return m.reply(`Translation failed: ${e.message}`);
  }
});