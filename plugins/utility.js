const { jidNormalizedUser } = require("@whiskeysockets/baileys");
const { Zoe, mode, Message, parsedJid } = require("../lib/Index");
const { dbController } = require("../lib/database");
const { getString } = require("./func/lang");

const lang = getString("utility");
const format = (str, values) => str.replace(/\$\{(\w+)\}/g, (_, key) => values[key] ?? "");

Zoe({
  pattern: "pp",
  fromMe: true,
  desc: lang.PP_DESC,
  type: "utility",
}, async (m, match, client) => {
  if (match === "remove") {
    await client.removeProfilePicture(client.user.id);
    return m.reply(lang.PR_ALERT);
  }
  if (m.reply_message?.type !== "imageMessage") return m.reply(lang.I_ALERT);
  const media = await m.reply_message.download();
  await client.updateProfile(client.user.id, media);
  return m.reply(lang.PU_ALERT);
});

Zoe({
  pattern: "quoted",
  fromMe: mode,
  desc: lang.QUOTED_DESC,
  type: "utility",
}, async (m, _, client) => {
  if (!m.quoted) return m.reply(lang.M_ALERT);
  const ms = await client.store.loadMessage(m.reply_message.id);
  if (!ms) return m.reply(lang.MNS_ALERT);
  const q = new Message(client, JSON.parse(JSON.stringify(ms.message)));
  if (!q.quoted) return client.forwardMessage(m.jid, q.data, { contextInfo: { isForwarded: false }, quoted: m.msg });
  await client.forwardMessage(m.jid, q.reply_message.data, { contextInfo: { isForwarded: false }, quoted: m.data });
});

Zoe({
  pattern: "setcmd",
  fromMe: true,
  desc: lang.SETCMD_DESC,
  type: "utility",
}, async (m, match) => {
  const s = m.reply_message?.msg?.stickerMessage;
  if (!s) return m.reply(lang.S_ALERT);
  if (!match) return m.reply(lang.STC_ALERT);
  const hash = s.fileSha256.join("");
  try {
    const data = await dbController.get("sticker", "123");
    const existing = Object.entries(data?.sticker_cmd || {}).find(([_, v]) => v === hash);
    if (existing) return m.reply(format(lang.ALREADY_BOUND, { cmd: existing[0] }));
    await dbController.set("sticker", "123", { sticker_cmd: { [match]: hash } });
    return await m.reply(format(lang.CSS_ALERT, { match }));
  } catch {
    await m.reply(lang.UERR_ALERT);
  }
});

Zoe({
  pattern: "delcmd",
  fromMe: true,
  desc: lang.DELCMD_DESC,
  type: "utility",
}, async (m, match) => {
  if (!match) return m.reply(lang.DC_ALERT);
  try {
    const deleted = await dbController.delete("sticker", "123", match);
    await m.reply(deleted ? format(lang.DSS_ALERT, { match }) : lang.NVC_ALERT);
  } catch {
    await m.reply(lang.UERR_ALERT);
  }
});


Zoe({
  pattern: "whois",
  fromMe: mode,
  desc: lang.WHOIS_DESC,
  type: "utility",
}, async (m, text) => {
  const { client, reply_message, isGroup, jid } = m;
  const num = text?.trim()?.replace(/\D/g, "");
  const target = jidNormalizedUser(num ? num + "@s.whatsapp.net" : reply_message?.sender);
  if (!target) return client.sendMessage(jid, { text: isGroup ? lang.RPN_ALERT : lang.NUF_ALERT });
  try {
    const [name, statusData, lidMapping] = await Promise.all([client.store.getName(target), client.fetchStatus(target), client.signalRepository.lidMapping.getLIDForPN(target)]);
    const lid = lidMapping ? jidNormalizedUser(lidMapping) : null;
    const pnMapping = lid ? await client.signalRepository.lidMapping.getPNForLID(lid) : null;
    const exist = pnMapping ? jidNormalizedUser(pnMapping) : target;
    const { status, setAt } = statusData?.[0]?.status || {};
    const setDate = setAt ? new Date(setAt).toLocaleString() : "Unknown";
    const wpno = exist?.match(/\d+/)?.[0];
    const url = await client.profilePictureUrl(lid || target, "image").catch(() => "https://files.catbox.moe/2fguma.png");
    const caption = `╭╺╺╺╡ 𝗨𝘀𝗲𝗿 𝗗𝗲𝘁𝗮𝗶𝗹𝘀\n\n 𝗡𝗮𝗺𝗲: _${name || "Not found"}_\n 𝗕𝗶𝗼: _${status?.trim() || "Not set"}_\n 𝗕𝗶𝗼 𝗦𝗲𝘁 𝗔𝘁: _${setDate}_\n 𝗨𝘀𝗲𝗿 𝗟𝗶𝗱: _${lid || "Unknown"}_\n 𝗨𝘀𝗲𝗿 𝗝𝗶𝗱: _${exist}_\n 𝗪𝗵𝗮𝘁𝘀𝗔𝗽𝗽: ${wpno ? `https://wa.me/${wpno}` : "Unknown"}\n\n╰╺╺╺╺╺╺╺╡`;
    return client.sendMessage(jid, { image: { url }, mimetype: "image/jpeg", caption });
  } catch {
    return m.reply(format(lang.FT_ALERT, { cmd: "fetch user info" }));
  }
});

Zoe({
  pattern: "getprivacy",
  fromMe: true,
  desc: lang.GETPRIVACY_DESC,
  type: "utility",
}, async (message, match, client) => {
  try {
    const { readreceipts, profile, status, online, last, groupadd, calladd } = await client.fetchPrivacySettings(true);
    const text = `╭╺╺╺╡ 𝗖𝘂𝗿𝗿𝗲𝗻𝘁 𝗣𝗿𝗶𝘃𝗮𝗰𝘆 𝗦𝗲𝘁𝘁𝗶𝗻𝗴𝘀\n\n 𝗥𝗲𝗮𝗱 𝗥𝗲𝗰𝗲𝗶𝗽𝘁𝘀: _${readreceipts}_\n 𝗣𝗿𝗼𝗳𝗶𝗹𝗲 𝗣𝗵𝗼𝘁𝗼: _${profile}_\n 𝗦𝘁𝗮𝘁𝘂𝘀: _${status}_\n 𝗢𝗻𝗹𝗶𝗻𝗲: _${online}_\n 𝗟𝗮𝘀𝘁 𝗦𝗲𝗲𝗻: _${last}_\n 𝗚𝗿𝗼𝘂𝗽 𝗔𝗱𝗱: _${groupadd}_\n 𝗖𝗮𝗹𝗹𝘀: _${calladd}_\n\n╰╺╺╺╺╺╺╺╡`;
    return message.reply(text);
  } catch {
    return message.reply(format(lang.FT_ALERT, { cmd: "fetch privacy settings" }));
  }
});

Zoe({
  pattern: "mpin",
  fromMe: true,
  desc: lang.MPIN_DESC,
  type: "utility",
}, async (message, match, client) => {
  if (!message.reply_message) return message.reply(lang.M_ALERT);
  const time = { 24: 86400, 7: 604800, 30: 2592000 }[match?.trim()];
  if (!time) return message.reply(lang.MPIN_ALERT);
  try {
    await client.sendMessage(message.jid, { pin: message.reply_message.data.key, type: 1, time });
    return message.reply(lang.MP_ALERT);
  } catch {
    return message.reply(format(lang.FT_ALERT, { cmd: "pin message" }));
  }
});

Zoe({
  pattern: "munpin",
  fromMe: true,
  desc: lang.UNPIN_DESC,
  type: "utility",
}, async (message, match, client) => {
  if (!message.reply_message) return message.reply(lang.M_ALERT);
  try {
    await client.sendMessage(message.jid, { pin: message.reply_message.data.key, type: 2 });
    return message.reply(lang.UMP_ALERT);
  } catch {
    return message.reply(format(lang.FT_ALERT, { cmd: "unpin message" }));
  }
});

Zoe({
  pattern: "mstar",
  fromMe: true,
  desc: "Star a message",
  type: "utility",
}, async (message, match, client) => {
  if (!message.reply_message) return message.reply(lang.M_ALERT);
  try {
    await client.chatModify({ star: { messages: [{ id: message.reply_message.data.key.id, fromMe: message.reply_message.data.key.fromMe }], star: true } }, message.jid);
    return message.reply("Message starred successfully.");
  } catch {
    return message.reply(format(lang.FT_ALERT, { cmd: "star message" }));
  }
});

Zoe({
  pattern: "munstar",
  fromMe: true,
  desc: "Unstar a message",
  type: "utility",
}, async (message, match, client) => {
  if (!message.reply_message) return message.reply(lang.M_ALERT);
  try {
    await client.chatModify({ star: { messages: [{ id: message.reply_message.data.key.id, fromMe: message.reply_message.data.key.fromMe }], star: false } }, message.jid);
    return message.reply("Message unstarred successfully.");
  } catch {
    return message.reply(format(lang.FT_ALERT, { cmd: "unstar message" }));
  }
});

Zoe({
  pattern: "deletechat",
  fromMe: true,
  desc: lang.DELETECHAT_DESC,
  type: "utility",
}, async (message, match, client) => {
  try {
    await client.chatModify({ delete: true, lastMessages: [message.data] }, message.jid);
    return message.reply(format(lang.CS_ALERT, { cmd: "deleted" }));
  } catch {
    return message.reply(format(lang.FT_ALERT, { cmd: "delete chat" }));
  }
});

Zoe({
  pattern: "archive",
  fromMe: true,
  desc: lang.ARCHIVE_DESC,
  type: "utility",
}, async (message, match, client) => {
  try {
    await client.chatModify({ archive: true, lastMessages: [message.data] }, message.jid);
    return message.reply(format(lang.CS_ALERT, { cmd: "archived" }));
  } catch {
    return message.reply(format(lang.FT_ALERT, { cmd: "archive chat" }));
  }
});

Zoe({
  pattern: "unarchive",
  fromMe: true,
  desc: lang.UNARCHIVE_DESC,
  type: "utility",
}, async (message, match, client) => {
  try {
    await client.chatModify({ archive: false, lastMessages: [message.data] }, message.jid);
    return message.reply(format(lang.CS_ALERT, { cmd: "unarchived" }));
  } catch {
    return message.reply(format(lang.FT_ALERT, { cmd: "unarchive chat" }));
  }
});

Zoe({
  pattern: "block",
  fromMe: true,
  desc: lang.BLOCK_DESC,
  type: "utility",
}, async (message, match, client) => {
  match = message.mention?.[0] || message.reply_message?.sender || match;
  try {
    if (match === "list") {
      const numbers = await client.fetchBlocklist();
      if (!numbers?.length) return message.reply(lang.NBF_ALERT);
      const blockList = `_*Block List*_\n\n${numbers.map(n => `- +${n.replace("@s.whatsapp.net", "")}`).join("\n")}`;
      return message.reply(blockList);
    }
    if (!match) return message.reply(lang.U_ALERT);
    const jid = parsedJid(match);
    await client.updateBlockStatus(jid[0], "block");
    return message.reply(`*Blocked:* +${jid[0].replace("@s.whatsapp.net", "")}`);
  } catch {
    return message.reply(format(lang.FT_ALERT, { cmd: "block" }));
  }
});

Zoe({
  pattern: "unblock",
  fromMe: true,
  desc: lang.UNBLOCK_DESC,
  type: "utility",
}, async (message, match, client) => {
  match = message.mention?.[0] || message.reply_message?.sender || match;
  try {
    if (match === "all") {
      const numbers = await client.fetchBlocklist();
      if (!numbers?.length) return message.reply("_*No block list found*_");
      await Promise.all(numbers.map(async jid => {
        await client.updateBlockStatus(jid, "unblock");
        await new Promise(res => setTimeout(res, 1500));
      }));
      const unblockList = `_*Unblocked All*_\n\n${numbers.map(n => `- +${n.replace("@s.whatsapp.net", "")}`).join("\n")}`;
      return message.reply(unblockList);
    }
    if (!match) return message.reply(lang.U_ALERT);
    const jid = parsedJid(match);
    await client.updateBlockStatus(jid[0], "unblock");
    return message.reply(`*Unblocked:* +${jid[0].replace("@s.whatsapp.net", "")}`);
  } catch {
    return message.reply(format(lang.FT_ALERT, { cmd: "unblock" }));
  }
});

Zoe({
  pattern: "setbio",
  fromMe: true,
  desc: lang.SETBIO_DESC,
  type: "utility",
}, async (message, match, client) => {
  if (!match) return message.reply(lang.GT_ALERT);
  try {
    await client.updateProfileStatus(match);
    message.reply(format(lang.UP_ALERT, { cmd: "Bio" }));
  } catch {
    return message.reply(format(lang.FT_ALERT, { cmd: "update bio" }));
  }
});

Zoe({
  pattern: "setname",
  fromMe: true,
  desc: lang.SETNAME_DESC,
  type: "utility",
}, async (message, match, client) => {
  if (!match) return message.reply(lang.GT_ALERT);
  try {
    await client.updateProfileName(match);
    message.reply(format(lang.UP_ALERT, { cmd: "Name" }));
  } catch {
    return message.reply(format(lang.FT_ALERT, { cmd: "update name" }));
  }
});

Zoe({
  pattern: "chatpin",
  fromMe: true,
  desc: lang.CHATPIN_DESC,
  type: "utility",
}, async (message, match, client) => {
  try {
    await client.chatModify({ pin: true }, message.jid);
    message.reply(format(lang.CS_ALERT, { cmd: "pinned" }));
  } catch {
    return message.reply(format(lang.FT_ALERT, { cmd: "pin chat" }));
  }
});

Zoe({
  pattern: "chatunpin",
  fromMe: true,
  desc: "Unpin a chat",
  type: "utility",
}, async (message, match, client) => {
  try {
    await client.chatModify({ pin: false }, message.jid);
    return message.reply(format(lang.CS_ALERT, { cmd: "unpinned" }));
  } catch {
    return message.reply(format(lang.FT_ALERT, { cmd: "unpin chat" }));
  }
});

Zoe({
  pattern: "dmsg",
  fromMe: true,
  desc: "Delete a replied message",
  type: "utility",
}, async (m, _, client) => {
  if (!m.reply_message) return m.reply("Reply to the message you want to delete.");
  try {
    await client.dmsg(m.jid, m.reply_message.id);
    return m.reply("Done")
  } catch (e) {
    await m.reply("Something went wrong");
  }
});