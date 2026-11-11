const {
  Zoe, mode, setWarn, removeWarn, isAdmin, handlePollMessage, getPollResults,
  sleep, extractUrl, PREFIX, resolveTargetsToRawNumbers,
  getMemberNumbers, sendGroupInvites
} = require("../lib/Index");
const { dbController } = require("../lib/database");
const { WARN_COUNT } = require("../config");
let { getString } = require("./func/lang");
const { jidNormalizedUser } = require("@whiskeysockets/baileys");

let lang = getString("group");
const format = (str, values) => str.replace(/\$\{(\w+)\}/g, (_, key) => values[key] ?? "");

Zoe({
  pattern: "gpp",
  fromMe: true,
  desc: lang.GPP_DESC,
  type: "group",
}, async (m, match, client) => {
  if (!m.isGroup) return m.reply(lang.G_ALERT);
  if (!(await isAdmin(m, client.user.lid))) return m.reply(lang.INA_ALERT);
  if (match === "remove") {
    await client.removeProfilePicture(m.jid);
    return m.reply(lang.GPPR_ALERT);
  }
  if (m.reply_message?.type !== "imageMessage") return m.reply(lang.I_ALERT);
  await client.updateProfile(m.jid, await m.reply_message.download());
  return m.reply(lang.GPP_ALERT);
});

Zoe({
  pattern: "glist",
  fromMe: true,
  type: "group",
  desc: lang.GLIST_DESC,
}, async (m) => {
  if (!m.isGroup) return m.reply(lang.G_ALERT);
  if (!(await isAdmin(m, m.client.user.lid))) return m.reply(lang.INA_ALERT);
  const result = await m.client.groupRequestParticipantsList(m.jid);
  if (!result.length) return m.reply(lang.TP_ALERT);

  const text = result.map((id, index) => {
    const phone = id.phone_number?.split("@")[0] || "Unknown";
    const lid = id.jid || "Unknown";
    const method = id.request_method || "Unknown";
    const timestamp = id.request_time
      ? new Date(Number(id.request_time) * 1000).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      : "Unknown";

    return `*${index + 1}. Pending Request*\n├─ Phone: +${phone}\n├─ LID: ${lid}\n├─ Method: ${method}\n└─ Requested: ${timestamp}`;
  }).join("\n\n");

  return m.reply(`${lang.HPJR_ALERT}\n\n*Total Requests:* ${result.length}\n\n${text}`);
});

Zoe({
  pattern: "gapprove",
  fromMe: true,
  type: "group",
  desc: lang.GAPPROVE_DESC,
}, async (m, match) => {
  if (!m.isGroup) return m.reply(lang.G_ALERT);
  if (!(await isAdmin(m, m.client.user.lid))) return m.reply(lang.INA_ALERT);
  if (!match) return m.reply(lang.AE_ALERT);

  const result = await m.client.groupRequestParticipantsList(m.jid);
  if (!result.length) return m.reply(lang.TP_ALERT);

  const jids = match === "all"
    ? result.map((id) => id.phone_number)
    : match.split(",").map((num) => num.trim().replace(/\+/g, "").replace(/\s/g, "") + "@s.whatsapp.net").filter((jid) => jid !== "@s.whatsapp.net");

  for (const jid of jids) {
    if (!result.map((id) => id.phone_number).includes(jid)) return m.reply(`+${jid.split("@")[0]} ${lang.NR_ALERT}`);
    await m.client.groupRequestParticipantsUpdate(m.jid, [jid], "approve");
    await sleep(1000);
  }
  return m.reply(match === "all" ? lang.ARP_ALERT : lang.SRP_ALERT);
});

Zoe({
  pattern: "greject",
  fromMe: true,
  type: "group",
  desc: lang.GREJECT_DESC,
}, async (m, match) => {
  if (!m.isGroup) return m.reply(lang.G_ALERT);
  if (!(await isAdmin(m, m.client.user.lid))) return m.reply(lang.INA_ALERT);
  if (!match) return m.reply(lang.RE_ALERT);

  const result = await m.client.groupRequestParticipantsList(m.jid);
  if (!result.length) return m.reply(lang.HPJR_ALERT);

  const jids = match === "all"
    ? result.map((id) => id.phone_number)
    : match.split(",").map((num) => num.trim().replace(/\+/g, "").replace(/\s/g, "") + "@s.whatsapp.net").filter((jid) => jid !== "@s.whatsapp.net");

  for (const jid of jids) {
    if (!result.map((id) => id.phone_number).includes(jid)) return m.reply(`+${jid.split("@")[0]} ${lang.NR_ALERT}`);
    await m.client.groupRequestParticipantsUpdate(m.jid, [jid], "reject");
    await sleep(800);
  }
  return m.reply(match === "all" ? lang.ARR_ALERT : lang.SRR_ALERT);
});

Zoe({
  pattern: "poll",
  alias: ["vote"],
  fromMe: true,
  desc: lang.POLL_DESC,
  type: "group",
}, async (m, match, client) => {
  if (!m.isGroup) return m.reply(lang.G_ALERT);
  try {
    match = match || m.reply_message?.text;
    const parts = match?.split(/[,|;]/);
    if (!parts || parts.length < 2) return m.reply(`_*Example:* ${PREFIX}poll title |option1|option2|option3..._`);

    const [title, ...opts] = parts;
    const { participants } = await client.groupMetadata(m.jid);
    const values = opts.map((name) => ({ name, id: "" })).slice(0, 10);

    return m.sendPoll(m.jid, {
      name: title,
      values,
      withPrefix: false,
      onlyOnce: true,
      participates: participants.map((p) => p.id),
      selectableCount: true,
    });
  } catch (err) {
    console.log(err);
  }
});

Zoe({
  pattern: "add",
  fromMe: true,
  desc: "Add user to group",
  type: "group",
}, async (m, text) => {
  if (!m.isGroup) return m.reply("*This command can only be used in groups.*");
  if (!(await isAdmin(m, m.client.user.lid))) return m.reply("*Only group admins can use this command.*");

  const targets = [];
  if (Array.isArray(m.mention) && m.mention.length) targets.push(...m.mention);
  else if (m.reply_message?.senderJid) targets.push(m.reply_message.senderJid);
  else if (text?.trim()) targets.push(text.trim());
  if (!targets.length) return m.reply("_Reply to someone, mention them, or provide a number._\n*Example:* .add 919747257996");

  const rawNumbers = await resolveTargetsToRawNumbers(m, targets);
  const uniqueNumbers = [...new Set(rawNumbers.filter((n) => n && n.length >= 8 && n.length <= 15))];
  if (!uniqueNumbers.length) return m.reply("*Could not resolve the target to a valid phone number.*");

  const groupJid = jidNormalizedUser(m.chat);
  let metadata;
  try {
    metadata = await m.client.groupMetadata(groupJid);
  } catch (err) {
    return m.reply("*Failed to get group information.*");
  }

  const memberNumbers = await getMemberNumbers(m, metadata);
  const alreadyMembers = [];
  const targetsToAdd = [];
  for (const number of uniqueNumbers) {
    if (memberNumbers.has(number)) alreadyMembers.push(number);
    else targetsToAdd.push({ number, jid: jidNormalizedUser(`${number}@s.whatsapp.net`) });
  }
  if (!targetsToAdd.length) return m.reply(`*Already in group:*\n${alreadyMembers.map((n) => `• ${n}`).join("\n")}`);

  const addJids = targetsToAdd.map((t) => t.jid);
  let results = [];
  try {
    results = await m.client.groupParticipantsUpdate(groupJid, addJids, "add");
  } catch (err) {
    console.log("groupParticipantsUpdate error:", err);
    const status = err?.output?.statusCode || err?.data?.statusCode || err?.statusCode;
    const message = err?.output?.payload?.message || err?.message || "Unknown error";
    if (status === 403 || status === 406 || status === 409 || message.toLowerCase().includes("bad-request")) {
      results = targetsToAdd.map((t) => ({ status: String(status || "unknown"), jid: t.jid, error: true }));
    } else {
      return m.reply(`*Failed to add user(s).*\nStatus: ${status || "unknown"}\nError: ${message}`);
    }
  }

  const added = [], failed = [], inviteRequired = [];
  for (let i = 0; i < targetsToAdd.length; i++) {
    const target = targetsToAdd[i];
    const result = results?.[i];
    if (!result) {
      failed.push({ number: target.number, status: "unknown", reason: "no response" });
      continue;
    }
    const status = String(result.status || "200");
    switch (status) {
      case "200": added.push(target.number); break;
      case "403": case "408": case "417":
        inviteRequired.push({ number: target.number, jid: target.jid, status });
        break;
      case "404": failed.push({ number: target.number, status, reason: "nonexistent WhatsApp account" }); break;
      case "409": alreadyMembers.push(target.number); break;
      case "419": failed.push({ number: target.number, status, reason: "group is full" }); break;
      default: failed.push({ number: target.number, status, reason: "unknown status" });
    }
  }

  const { invited, inviteFailed } = await sendGroupInvites(m, groupJid, metadata, inviteRequired);
  const response = [];
  if (added.length) response.push(`*ADDED:*\n${added.map((n) => `• ${n}`).join("\n")}`);
  if (invited.length) response.push(`*INVITE SENT:*\n${invited.map((n) => `• ${n}`).join("\n")}`);
  if (alreadyMembers.length) response.push(`*ALREADY IN GROUP:*\n${alreadyMembers.map((n) => `• ${n}`).join("\n")}`);
  if (inviteFailed.length) response.push(`*INVITE FAILED:*\n${inviteFailed.map(({ number, status }) => `• ${number} (${status})`).join("\n")}`);
  if (failed.length) response.push(`*FAILED:*\n${failed.map(({ number, status, reason }) => `• ${number} (${status}${reason ? ` - ${reason}` : ""})`).join("\n")}`);

  return m.reply(response.join("\n\n") || "*Nothing was changed.*");
});

Zoe({
  pattern: "kick",
  type: "group",
  fromMe: true,
  desc: lang.KICK_DESC,
}, async (m, match) => {
  if (!m.isGroup) return m.reply(lang.G_ALERT);
  if (!(await isAdmin(m, m.client.user.lid))) return m.reply(lang.INA_ALERT);

  const targets = m.mention?.length ? m.mention : m.reply_message?.senderJid ? [m.reply_message.senderJid] : match?.trim()?.split(/\s+/);
  if (!targets?.length) return m.reply(lang.RUN_ALERT);

  const numbers = [...new Set((await resolveTargetsToRawNumbers(m, targets)).filter((n) => n?.length >= 8 && n?.length <= 15))];
  if (!numbers.length) return m.reply("*Invalid user.*");

  const members = await getMemberNumbers(m, await m.client.groupMetadata(m.jid));
  const jids = numbers.filter((n) => members.has(n)).map((n) => jidNormalizedUser(`${n}@s.whatsapp.net`));
  if (!jids.length) return m.reply("*User is not in the group.*");

  try {
    await m.client.groupParticipantsUpdate(m.jid, jids, "remove");
    return m.reply(`*${jids.map((j) => `@${j.split("@")[0]}`).join(", ")} ${lang.KS_ALERT}*`, { mentions: jids });
  } catch {
    return m.reply("*Failed to remove user(s).*");
  }
});

Zoe({
  pattern: "promote",
  fromMe: true,
  type: "group",
  desc: lang.PROMOTE_DESC,
}, async (m, match) => {
  if (!m.isGroup) return m.reply(lang.G_ALERT);
  match = m.mention?.[0] || m.reply_message?.senderJid || match;
  if (!match) return m.reply(lang.U_ALERT);
  if (!(await isAdmin(m, m.client.user.lid))) return m.reply(lang.INA_ALERT);

  const numbers = await resolveTargetsToRawNumbers(m, [match]);
  const jid = numbers.map((n) => jidNormalizedUser(`${n}@s.whatsapp.net`));
  if (!jid.length) return m.reply("*Invalid user.*");
  console.log(jid, jid[0]);
  if (await isAdmin(m, jid[0])) return m.reply("*User is already an admin.*");

  await m.client.groupParticipantsUpdate(m.jid, jid, "promote");
  return m.reply(`*@${jid[0].split("@")[0]} ${lang.PS_ALERT}*`, { mentions: jid });
});

Zoe({
  pattern: "demote",
  fromMe: true,
  type: "group",
  desc: lang.DEMOTE_DESC,
}, async (m, match) => {
  if (!m.isGroup) return m.reply(lang.G_ALERT);
  match = m.mention?.[0] || m.reply_message?.senderJid || match;
  if (!match) return m.reply(lang.U_ALERT);
  if (!(await isAdmin(m, m.client.user.lid))) return m.reply(lang.INA_ALERT);

  const numbers = await resolveTargetsToRawNumbers(m, [match]);
  const jid = numbers.map((n) => jidNormalizedUser(`${n}@s.whatsapp.net`));
  if (!jid.length) return m.reply("*Invalid user.*");
  if (!(await isAdmin(m, jid[0]))) return m.reply("*User is not an admin.*");

  await m.client.groupParticipantsUpdate(m.jid, jid, "demote");
  return m.reply(`*@${jid[0].split("@")[0]} ${lang.DS_ALERT}*`, { mentions: jid });
});

Zoe({
  pattern: "invite",
  fromMe: true,
  type: "group",
  desc: lang.INVITE_DESC,
}, async (m) => {
  if (!m.isGroup) return m.reply(lang.G_ALERT);
  if (!(await isAdmin(m, m.client.user.lid))) return m.reply(lang.INA_ALERT);
  return m.reply(`https://chat.whatsapp.com/${await m.client.groupInviteCode(m.jid)}`);
});

Zoe({
  pattern: "mute",
  fromMe: true,
  type: "group",
  desc: lang.MUTE_DESC,
}, async (m) => {
  if (!m.isGroup) return m.reply(lang.G_ALERT);
  if (!(await isAdmin(m, m.client.user.lid))) return m.reply(lang.INA_ALERT);

  const mutem = await m.reply(lang.MUTE.MUTING);
  await sleep(500);
  await m.client.groupSettingUpdate(m.jid, "announcement");
  return mutem.edit(lang.MUTE.MUTED);
});

Zoe({
  pattern: "unmute",
  fromMe: true,
  type: "group",
  desc: lang.UNMUTE_DESC,
}, async (m) => {
  if (!m.isGroup) return m.reply(lang.G_ALERT);
  if (!(await isAdmin(m, m.client.user.lid))) return m.reply(lang.INA_ALERT);

  const unmutem = await m.reply(lang.MUTE.UNMUTING);
  await sleep(500);
  await m.client.groupSettingUpdate(m.jid, "not_announcement");
  return unmutem.edit(lang.MUTE.UNMUTED);
});

Zoe({
  pattern: "revoke",
  fromMe: true,
  type: "group",
  desc: lang.REVOKE_DESC,
}, async (m) => {
  if (!m.isGroup) return m.reply(lang.G_ALERT);
  if (!(await isAdmin(m, m.client.user.lid))) return m.reply(lang.INA_ALERT);
  await m.client.groupRevokeInvite(m.jid);
  return m.reply(lang.GLR_ALERT);
});

Zoe({
  pattern: "join",
  fromMe: true,
  desc: lang.JOIN_DESC,
  type: "group",
}, async (m, match) => {
  match = extractUrl(match || m.reply_message?.text);
  if (!match) return m.reply(lang.NGL_ALERT);

  const regex = /^(https?:\/\/)?(chat\.whatsapp\.com\/[A-Za-z0-9]{20,})/i;
  const matchClean = match.match(regex);
  if (!matchClean) return m.reply(lang.NWL_ALERT);

  if (match.includes("chat.whatsapp.com")) {
    const groupCode = match.split("https://chat.whatsapp.com/")[1];
    const joinResult = await m.client.groupAcceptInvite(groupCode);
    if (joinResult) return m.reply("*Joined Group!*");
    return m.reply(lang.IGL_ALERT);
  }
  return m.reply(lang.IGL_ALERT);
});

Zoe({
  pattern: "left",
  fromMe: true,
  type: "group",
  desc: lang.LEFT_DESC,
}, async (m) => {
  if (!m.isGroup) return m.reply(lang.G_ALERT);
  await m.client.groupLeave(m.jid);
});

Zoe({
  pattern: "lock",
  fromMe: true,
  type: "group",
  desc: lang.LOCK_DESC,
}, async (m) => {
  if (!m.isGroup) return m.reply(lang.G_ALERT);
  if (!(await isAdmin(m, m.client.user.lid))) return m.reply(lang.INA_ALERT);

  const meta = await m.client.groupMetadata(m.jid);
  if (meta.restrict) return m.reply(lang.AAM_ALERT);
  await m.client.groupSettingUpdate(m.jid, "locked");
  return m.reply(lang.OAM_ALERT);
});

Zoe({
  pattern: "unlock",
  fromMe: true,
  type: "group",
  desc: lang.UNLOCK_DESC,
}, async (m) => {
  if (!m.isGroup) return m.reply(lang.G_ALERT);
  if (!(await isAdmin(m, m.client.user.lid))) return m.reply(lang.INA_ALERT);

  const meta = await m.client.groupMetadata(m.jid);
  if (!meta.restrict) return m.reply(lang.AEM_ALERT);
  await m.client.groupSettingUpdate(m.jid, "unlocked");
  return m.reply(lang.OEM_ALERT);
});

Zoe({
  pattern: "gname",
  fromMe: true,
  type: "group",
  desc: lang.GNAME_DESC,
}, async (m, match) => {
  if (!m.isGroup) return m.reply(lang.G_ALERT);
  match = match || m.reply_message?.text;
  if (!match) return m.reply(lang.NGN_ALERT);

  const meta = await m.client.groupMetadata(m.jid);
  if (!meta.restrict) {
    await m.client.groupUpdateSubject(m.jid, match);
    return m.reply(lang.SU_ALERT + match);
  }
  if (!(await isAdmin(m, m.client.user.lid))) return m.reply(lang.INA_ALERT);
  await m.client.groupUpdateSubject(m.jid, match);
  return m.reply(lang.SU_ALERT + match);
});

Zoe({
  pattern: "gdesc",
  fromMe: true,
  type: "group",
  desc: lang.GDESC_DESC,
}, async (m, match) => {
  if (!m.isGroup) return m.reply(lang.G_ALERT);
  match = match || m.reply_message?.text;
  if (!match) return m.reply(lang.NGD_ALERT);

  const meta = await m.client.groupMetadata(m.jid);
  if (!meta.restrict) {
    await m.client.groupUpdateDescription(m.jid, match);
    return m.reply(lang.DU_ALERT);
  }
  if (!(await isAdmin(m, m.client.user.lid))) return m.reply(lang.INA_ALERT);
  await m.client.groupUpdateDescription(m.jid, match);
  return m.reply(lang.DU_ALERT);
});

Zoe({
  pattern: "gjid",
  fromMe: true,
  type: "group",
  desc: lang.GJID_DESC,
}, async (m, match) => {
  if (match === "gjids" && m.isGroup) {
    const list = await m.client.groupFetchAllParticipating();
    const g = Object.values(list).map((group) => `JID: ${group.id}\nGroup Name: ${group.subject}\n`).join("\n");
    return m.reply(`*All Group Jid*\n\n${g}`);
  }

  if (match === "ajid" && m.isGroup) {
    const { participants, subject } = await m.client.groupMetadata(m.jid);
    const admins = participants.filter((u) => u.admin).map((u) => u.phoneNumber || u.id).join("\n\n");
    return m.reply(`*Group Admins Jid*\n\n*Group Name:* ${subject}\n*Admins:*\n\n${admins}`);
  }

  if (match === "pjid" && m.isGroup) {
    const { participants, subject } = await m.client.groupMetadata(m.jid);
    const participantJids = participants.map((u) => u.phoneNumber || u.id).join("\n\n");
    return m.reply(`*Group Participants Jid*\n\n*Group Name:* ${subject}\n*All Participants Jid:*\n\n${participantJids}`);
  }

  if (m.isGroup) return m.sendPoll(m.jid, {
    name: "\n*Group Jid Info 🎏*\n",
    values: [
      { name: "Group Admins Jid", id: `${PREFIX}gjid ajid` },
      { name: "Group Participants Jid", id: `${PREFIX}gjid pjid` },
      { name: "All Group Jids", id: `${PREFIX}gjid gjids` },
    ],
    withPrefix: true,
    onlyOnce: false,
    participates: [m.sender],
    selectableCount: true,
  });

  const list = await m.client.groupFetchAllParticipating();
  const g = Object.values(list).map((group) => `JID: ${group.id}\nGroup Name: ${group.subject}\n`).join("\n");
  return m.reply(`*All Group Jid*\n\n${g}`);
});

Zoe({
  pattern: "ginfo",
  fromMe: true,
  type: "group",
  desc: lang.GINFO_DESC,
}, async (m, match) => {
  match = extractUrl(match || m.reply_message?.text);
  if (!match && m.isGroup) match = `https://chat.whatsapp.com/${await m.client.groupInviteCode(m.jid)}`;
  if (!match) return m.reply(lang.NWL_ALERT);

  const [link, invite] = match.match(/chat.whatsapp.com\/([0-9A-Za-z]{20,24})/i) || [];
  if (!invite) return m.reply(lang.IGL_ALERT);

  const response = await m.client.groupGetInviteInfo(invite);
  if (!response.id) return m.reply(lang.IGL_ALERT);

  const url = await m.client.profilePictureUrl(response.id, "image").catch(() => "https://files.catbox.moe/2fguma.png");
  const caption =
    `╭╺╺╺╡ 𝗚𝗿𝗼𝘂𝗽 𝗜𝗻𝗳𝗼\n\n` +
    ` 𝗜𝗗: _${response.id}_\n` +
    ` 𝗦𝘂𝗯𝗷𝗲𝗰𝘁: _${response.subject}_\n` +
    ` 𝗢𝘄𝗻𝗲𝗿: _${response.ownerPn ? response.ownerPn.split("@")[0] : "Unknown"}_\n` +
    ` 𝗦𝗶𝘇𝗲: _${response.size}_\n` +
    ` 𝗥𝗲𝘀𝘁𝗿𝗶𝗰𝘁: _${response.restrict}_\n` +
    ` 𝗔𝗻𝗻𝗼𝘂𝗻𝗰𝗲: _${response.announce}_\n` +
    ` 𝗖𝗿𝗲𝗮𝘁𝗶𝗼𝗻: _${require("moment-timezone")(response.creation * 1000).tz("Asia/Kolkata").format("DD/MM/YYYY HH:mm:ss")}_\n` +
    ` 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻: ${response.desc || "No description"}\n\n` +
    `╰╺╺╺╺╺╺╺╡`;

  await m.client.sendMessage(m.jid, { image: { url }, mimetype: "image/jpeg", caption });
});

Zoe({
  pattern: "create",
  fromMe: true,
  desc: lang.CREATE_DESC,
  type: "group",
}, async (m, match) => {
  const gName = match || m.pushName;
  if (!m.reply_message?.senderJid) return m.reply(lang.CG_ALERT);

  const numbers = await resolveTargetsToRawNumbers(m, [m.reply_message.senderJid, m.sender]);
  const participants = numbers.map((n) => jidNormalizedUser(`${n}@s.whatsapp.net`));
  if (!participants.length) return m.reply("*Invalid user.*");

  await m.client.groupCreate(gName, participants);
  return m.reply(lang.SC_ALERT);
});

Zoe({
  pattern: "tag",
  fromMe: true,
  desc: lang.TAG_DESC,
  type: "group",
}, async (m, x, c) => {
  m.client = c;
  if (!m.isGroup) return c.sendMessage(m.jid, { text: `@${m.sender.split("@")[0]}`, mentions: [m.sender] });

  const g = await c.groupMetadata(m.jid).catch(() => { });
  if (!g) return m.reply("Failed to fetch group metadata.");

  const p = g.participants;
  const admins = p.filter((v) => v.admin).map((v) => v.id);
  let text = "";
  let ids = [];

  if (["all", "everyone"].includes(x)) ids = p.map((v) => v.id);
  else if (["admin", "admins"].includes(x)) ids = admins;
  else if (["me", "mee"].includes(x)) return c.sendMessage(m.jid, { text: `@${m.sender.split("@")[0]}`, mentions: [m.sender] });
  else if (x || (m.reply_message && m.reply_message.text)) {
    text = x || m.reply_message.text;
    ids = p.map((v) => v.id);
  } else if (m.reply_message) return c.forwardMessage(m.jid, m.reply_message.data, { mentions: p.map((v) => v.id) });
  else return m.reply("*Example :* \n" + "_*tag all*_\n" + "_*tag admin*_\n" + "_*tag me*_\n" + "_*tag text*_\n" + lang.TM_ALERT);

  if (!text) text = ids.map((id, i) => `${i + 1}. @${id.split("@")[0]}`).join("\n");
  return c.sendMessage(m.jid, { text, mentions: ids });
});


Zoe({
  pattern: "warn",
  fromMe: true,
  desc: lang.WARN_DESC,
  type: "group",
}, async (m, match) => setWarn(m, match, WARN_COUNT));

Zoe({
  pattern: "resetwarn",
  fromMe: true,
  desc: "Reset warnings",
  type: "group",
}, async (m) => removeWarn(m));

const settingHandler = (key, label) => Zoe({
  pattern: key,
  fromMe: true,
  desc: `${label} message`,
  type: "group",
}, async (m, match) => {
  const id = key === "mention" ? m.client.user.id : m.jid;
  const status = await dbController.status("personal", id, key);
  const stat = status ? "on" : "off";

  if (!match) return m.sendPoll(m.jid, {
    name: `\n*${label} Manager 🎏*\n\n_Status: ${stat}_\n\n` + lang.CAA_ALERT,
    values: [
      { name: `${key} get`, id: `${PREFIX}${key} get` },
      { name: `${key} on`, id: `${PREFIX}${key} on` },
      { name: `${key} off`, id: `${PREFIX}${key} off` },
      { name: `${key} delete`, id: `${PREFIX}${key} delete` },
    ],
    withPrefix: true,
    onlyOnce: false,
    participates: [m.sender],
    selectableCount: true,
  });

  const action = match.toLowerCase();
  if (action === "get") {
    const msg = await dbController.get("personal", id, key);
    return msg ? m.reply(msg.message) : m.reply(format(lang.TNS_ALERT, { key }));
  }
  if (["on", "off"].includes(action)) {
    if (stat === action) return m.reply(format(lang.A_ALERT, { stat }));
    await dbController.status("personal", id, key, action === "on");
    return m.reply(`*${key} ${action}*`);
  }
  if (action === "delete") {
    await dbController.delete("personal", id, key);
    return m.reply(format(lang.DSSS_ALERT, { key, cmd: "deleted" }));
  }
  await dbController.set("personal", id, match, key);
  return m.reply(format(lang.DSSS_ALERT, { key, cmd: "set" }));
});

["mention", "welcome", "goodbye"].forEach((k) => settingHandler(k, k.charAt(0).toUpperCase() + k.slice(1)));

Zoe({
  pattern: "rvote",
  fromMe: mode,
  desc: lang.RVOTE_DESC,
  type: "group",
  alias: ["reactvote"],
}, async (m, x, c) => {
  if (!m.isGroup) return m.reply(lang.G_ALERT);

  const input = x?.trim().toLowerCase();
  if (!input) return m.reply("Invalid input.\n" + "eg- rvote whats your favorite fruit|🍉-watermelon|🍌-banana|🍍-pineapple");

  if (input === "get") {
    if (!m.reply_message?.text?.includes("╭╺╺╺╺╺╡𝗥𝗲𝗮𝗰𝘁𝗶𝗼𝗻 𝗣𝗼𝗹𝗹")) return m.reply(lang.RPM_ALERT);
    return m.reply(await getPollResults(m.reply_message.id, true));
  }

  const [q, ...opts] = input.split("|").map((e) => e.trim());
  if (!q || !opts.length) return m.reply("❌ Use: Question | emoji - label | ...");

  let pollText = `╭╺╺╺╺╺╡𝗥𝗲𝗮𝗰𝘁𝗶𝗼𝗻 𝗣𝗼𝗹𝗹\n╎\n╎ 𝗤: _${q[0].toUpperCase() + q.slice(1)}_\n╎\n`;
  let valid = 0;

  for (const opt of opts) {
    const [emoji, label] = opt.split("-").map((s) => s.trim());
    if (emoji && label) {
      pollText += `╎ ${emoji} - ${label}\n`;
      valid = 1;
    }
  }

  if (!valid) return m.reply('❌ Use "emoji - label" format.');
  const msg = await m.reply(pollText + "╰╺╺╺╺╺╺╺╺╺╺╡");
  return handlePollMessage({ id: msg.id, sender: msg.sender, text: msg.text });
});