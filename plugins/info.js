const { Zoe, mode, sendMenu, formatTime } = require("../lib/Index");
const { jidNormalizedUser } = require("@whiskeysockets/baileys");
const { dbController } = require("../lib/database");
let { getString } = require("./func/lang");
const { Image } = require("node-webpmux");
let lang = getString("info");

Zoe({
  pattern: "menu",
  alias: ["list", "commands"],
  fromMe: mode,
  desc: lang.MENU_DESC,
  type: "info",
}, async (m) => sendMenu(m));

Zoe({
  pattern: "alive",
  fromMe: mode,
  desc: lang.ALIVE_DESC,
  type: "info",
}, async (m, match) => {
  const id = m.client.user.id;
  const stored = await dbController.get("personal", id, "alive");
  const cmd = match?.toLowerCase();

  if (cmd === "get") return stored ? await m.reply(stored.message) : await m.reply(lang.TAS_ALERT);
  if (cmd === "delete") return stored ? (await dbController.delete("personal", id, "alive"), await m.reply(lang.ADS_ALERT)) : await m.reply(lang.TASD_ALERT);
  if (match) {
    await dbController.set("personal", id, match, "alive");
    return m.reply(lang.ASS_ALERT);
  }

  return stored ? await m.sendAlive(m.jid) : await m.reply(lang.ALIVE_ALERT);
});

Zoe({
  pattern: "ping",
  fromMe: mode,
  desc: lang.PING_DESC,
  type: "info",
}, async (m) => {
  const start = Date.now();
  const msg = await m.reply("*Ping*");
  await msg.edit(`*Zoe!*\n*Latency:* ${Date.now() - start} ms`);
});

Zoe({
  pattern: "jid",
  fromMe: mode,
  desc: lang.GJID_DESC,
  type: "info",
}, async (m) => {
  let jid = m.mention[0] || m.reply_message?.senderJid || m.reply_message?.sender || m.jid;
  if (jid.endsWith("@lid")) jid = await m.client.signalRepository.lidMapping.getPNForLID(jid) || jid;
  await m.reply(jidNormalizedUser(jid));
});

Zoe({
  pattern: "runtime",
  alias: ["uptime"],
  fromMe: true,
  desc: lang.RUNTIME,
  type: "info",
}, async (m) => {
  await m.reply(`*Runtime:* ${formatTime(process.uptime())}`);
});

Zoe({
  pattern: "exif",
  fromMe: mode,
  desc: lang.EXIF_DESC,
  type: "info",
}, async (m) => {
  if (m.reply_message?.type !== "stickerMessage") return m.reply(lang.S_ALERT);
  const i = new Image();
  await i.load(await m.reply_message.download());
  if (!i.exif) throw new Error(lang.F_ALERT);
  const start = i.exif.indexOf(0x7B);
  if (start === -1) throw new Error(lang.F_ALERT);
  const e = JSON.parse(i.exif.subarray(start).toString("utf8").replace(/\0+$/g, "").trim());
  const g = (k) => e[k] || "N/A";
  await m.reply(
    `╭╺╺╺╡ 𝗦𝘁𝗶𝗰𝗸𝗲𝗿 𝗗𝗲𝘁𝗮𝗶𝗹𝘀\n\n` +
    ` 𝗣𝗮𝗰𝗸 𝗡𝗮𝗺𝗲: _${g("sticker-pack-name")}_\n` +
    ` 𝗣𝗮𝗰𝗸 𝗔𝘂𝘁𝗵𝗼𝗿: _${g("sticker-pack-publisher")}_\n` +
    ` 𝗣𝗮𝗰𝗸 𝗜𝗗: _${g("sticker-pack-id")}_\n` +
    ` 𝗣𝗮𝗰𝗸 𝗘𝗺𝗼𝗷𝗶𝘀: _${g("emojis")}_\n\n` +
    `╰╺╺╺╺╺╺╺╡`
  );
});