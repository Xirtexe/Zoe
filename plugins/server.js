const { Zoe, PREFIX, route: { update, restart, variable }, extractUrl, sleep, isUrl } = require("../lib/Index");
const { dbController } = require("../lib/database");
const { jidNormalizedUser } = require("@whiskeysockets/baileys");
const { getString } = require("./func/lang");
const { version } = require("../package");
const axios = require("axios");
const fs = require("fs");
const util = require("util");
const git = require("simple-git")();
const config = require("../config");
const lang = getString("server");

const format = (str, values) => str.replace(/\$\{(\w+)\}/g, (_, key) => values[key] ?? "");
const normalizeNumber = value => String(value).trim().split("@")[0].replace(/\D/g, "");
const validNumber = number => number && number.length >= 8 && number.length <= 15;
const getSudoList = async () => [...new Set(String(await variable.get("SUDO") || "").split(",").map(normalizeNumber).filter(validNumber))];

async function resolveNumbers(m, text) {
  const targets = m.mention?.length ? m.mention : m.reply_message?.senderJid ? [m.reply_message.senderJid] : text?.trim() ? [text.trim()] : [];
  if (!targets.length) return null;
  const numbers = [];
  for (const target of targets) {
    const value = String(target).trim();
    if (value.endsWith("@lid")) {
      try {
        const pn = jidNormalizedUser(await m.client.signalRepository.lidMapping.getPNForLID(jidNormalizedUser(value)));
        const number = normalizeNumber(pn);
        if (validNumber(number)) numbers.push(number);
      } catch (err) {
        console.log(`Failed to resolve LID ${value}:`, err.message);
      }
      continue;
    }
    const number = normalizeNumber(value);
    if (validNumber(number)) numbers.push(number);
  }
  return [...new Set(numbers)];
}

Zoe({
  pattern: "update",
  fromMe: true,
  desc: lang.UPDATE_DESC,
  type: "server",
}, async (m, match) => {
  try {
    await git.fetch();
    const log = await git.log(["main..origin/main"]);
    if (!log.total) return await m.reply(format(lang.LT_ALERT, { version }));
    if (match?.trim().toLowerCase() === "now") {
      await update(m);
      return await restart();
    }
    const cu = await m.reply(lang.CU_ALERT);
    const updates = log.all.map((c, i) => ` *${i + 1}.* _${c.message}_\n╎`).join("");
    return await cu.edit(format(lang.UPM_ALERT, { updates, PREFIX }));
  } catch (error) {
    console.error("[UPDATE]", error);
    return await m.reply("*Error checking for updates.*");
  }
});

Zoe({
  pattern: "restart",
  alias: ["reboot"],
  fromMe: true,
  desc: lang.RESTART_DESC,
  type: "server",
}, async (m, _, client) => {
  await client.sendMessage(m.jid, { text: lang.R_ALERT });
  return await restart();
});

Zoe({
  pattern: "server",
  alias: ["platform"],
  fromMe: true,
  desc: lang.SERVER_DESC,
  type: "server",
}, async (m, _, client) => {
  return await m.reply(format(lang.ZR_ALERT, { client: client.server }));
});

Zoe({
  pattern: "setvar",
  alias: ["addvar"],
  fromMe: true,
  desc: lang.SETVAR_DESC,
  type: "server",
}, async (m, text) => {
  if (!text?.trim()) return await m.reply(lang.UFKV_ALERT);
  const separator = text.indexOf(":");
  if (separator === -1) return await m.reply(lang.NFKV_ALERT);
  const key = text.slice(0, separator).trim().toUpperCase();
  const value = text.slice(separator + 1).trim();
  if (!key) return await m.reply(lang.MK_ALERT);
  if (!value) return await m.reply(lang.MV_ALERT);
  if (!await variable.set(key, value)) return await m.reply(format(lang.EVAR_ALERT, { cmd: "set/change in" }));
  await dbController.set("vars", key, value, true);
  await m.reply(`Set ${key} to ${value}, restarting...`);
  return await restart();
});

Zoe({
  pattern: "delvar",
  alias: ["rmvar"],
  fromMe: true,
  desc: lang.DELVAR_DESC,
  type: "server",
}, async (m, text) => {
  if (!text?.trim()) return await m.reply(lang.DEX_ALERT);
  const key = text.trim().toUpperCase();
  if (!await variable.delete(key)) return await m.reply(format(lang.EVAR_ALERT, { cmd: "deleting" }));
  await dbController.set("vars", key, null, false);
  await m.reply(`Deleted ${key}, restarting...`);
  return await restart();
});

Zoe({
  pattern: "getvar",
  fromMe: true,
  desc: lang.GETVAR_DESC,
  type: "server",
}, async (m, text) => {
  if (!text?.trim()) return await m.reply(lang.GVEX_ALERT);
  const key = text.trim().toUpperCase();
  const value = await variable.get(key);
  if (value === undefined || value === null) return await m.reply(lang.NFV_ALERT);
  return await m.reply(`*${key}* = ${value}`);
});

Zoe({
  pattern: "getsudo",
  alias: ["getadmins"],
  fromMe: true,
  desc: "Shows sudo numbers",
  type: "server",
}, async (m) => {
  const sudoList = await getSudoList();
  if (!sudoList.length) return await m.reply("*No SUDO numbers are currently set.*");
  return await m.reply(`_*SUDO NUMBERS ARE :*_\n\`\`\`${sudoList.join(",")}\`\`\``);
});

Zoe({
  pattern: "setsudo",
  fromMe: true,
  desc: "Set sudo number",
  type: "server",
}, async (m, text) => {
  const numbers = await resolveNumbers(m, text);
  if (!numbers) return await m.reply("_Reply to someone/mention/number_\n*Example:* .setsudo @user");
  if (!numbers.length) return await m.reply("*Could not resolve the mentioned users to phone numbers.*");
  const sudoList = await getSudoList();
  const added = numbers.filter(number => !sudoList.includes(number));
  const alreadySudo = numbers.filter(number => sudoList.includes(number));
  if (!added.length) return await m.reply(`*Already SUDO:*\n${alreadySudo.map(number => `• ${number}`).join("\n")}`);
  const newSudoValue = [...sudoList, ...added].join(",");
  if (!await variable.set("SUDO", newSudoValue)) return await m.reply("*Error setting SUDO.*");
  await dbController.set("vars", "SUDO", newSudoValue, true);
  await m.buildFullSudoList();
  return await m.reply(`*ADDED SUDO:*\n${added.map(number => `• ${number}`).join("\n")}\n\n*ALL SUDO NUMBERS:*\n\`\`\`${newSudoValue || "NONE"}\`\`\``);
});

Zoe({
  pattern: "delsudo",
  fromMe: true,
  desc: "Delete sudo number",
  type: "server",
}, async (m, text) => {
  const numbers = await resolveNumbers(m, text);
  if (!numbers) return await m.reply("_Reply to someone/mention/number_\n*Example:* .delsudo @user");
  if (!numbers.length) return await m.reply("*Could not resolve the mentioned users to phone numbers.*");
  const sudoList = await getSudoList();
  const deleted = numbers.filter(number => sudoList.includes(number));
  const notSudo = numbers.filter(number => !sudoList.includes(number));
  if (!deleted.length) return await m.reply(`*Not SUDO:*\n${notSudo.map(number => `• ${number}`).join("\n")}`);
  const newSudoValue = sudoList.filter(number => !deleted.includes(number)).join(",");
  if (!await variable.set("SUDO", newSudoValue)) return await m.reply("*Error updating SUDO.*");
  await dbController.set("vars", "SUDO", newSudoValue, !!newSudoValue);
  await m.buildFullSudoList();
  return await m.reply(`*REMOVED SUDO:*\n${deleted.map(number => `• ${number}`).join("\n")}\n\n*ALL SUDO NUMBERS:*\n\`\`\`${newSudoValue || "NONE"}\`\`\``);
});

Zoe({
  pattern: "allvars",
  alias: ["listvars"],
  fromMe: true,
  desc: lang.LISTVAR_DESC,
  type: "server",
}, async (m) => {
  const entries = Object.entries(config).filter(([key]) => key !== "DATABASE");
  if (!entries.length) return await m.reply(lang.NFC_ALERT);
  let msg = "*Config Variables:*\n\n";
  for (const [key, value] of entries) {
    let v;
    try {
      v = typeof value === "object" ? JSON.stringify(value) : String(value);
    } catch {
      v = "[Circular Object]";
    }
    msg += `- *${key}* = ${v}\n`;
  }
  return await m.reply(msg);
});

Zoe({
  pattern: "plugin",
  fromMe: true,
  desc: lang.PLUGIN_DESC,
  type: "server",
}, async (m, match) => {
  let pluginName = "";
  match = match || m.reply_message?.text;
  if (!match) return await m.reply(lang.PEX_ALERT);
  if (match === "list") {
    const data = await dbController.get("plugins");
    if (!data?.length) return await m.reply(lang.NPF_ALERT);
    data.forEach(item => pluginName += `*${item.name}:* ${item.url}\n`);
    return await m.reply(pluginName);
  }
  if (isUrl(match)) {
    const extracted = await extractUrl(match);
    const arr = Array.isArray(extracted) ? extracted : extracted ? [extracted] : [];
    for (const element of arr) {
      let url;
      try {
        url = new URL(element);
      } catch {
        return await m.reply(lang.IU_ALETT);
      }
      url = url.host === "gist.github.com" ? url.toString().replace("gist.github.com", "gist.githubusercontent.com") + "/raw" : url.toString();
      try {
        const { data, status } = await axios.get(url);
        if (status === 200) {
          pluginName = (data.match(/(?<=pattern:) ["'](.*?)["']/g) || []).map(mt => mt.trim().split(" ")[0]).join(", ").replace(/['"]/g, "") || "__" + Math.random().toString(36).substring(8);
          const fileName = pluginName.split(",")[0] + ".js";
          fs.writeFileSync(__dirname + "/" + fileName, data);
          try {
            require("./" + fileName);
          } catch (e) {
            fs.unlinkSync(__dirname + "/" + fileName);
            return await m.reply(lang.IP_ALERT + "\n\n```" + util.format(e) + "```");
          }
          await dbController.set("plugin", pluginName.split(",")[0], url);
          await m.reply(lang.NPI_ALERT + ": _" + pluginName + "_");
          await sleep(1500);
        }
      } catch (error) {
        console.log(error);
        return await m.reply(lang.ERRP_ALERT);
      }
    }
  } else {
    try {
      const { message } = await dbController.get("plugin", match);
      await m.reply(message.trim());
    } catch {
      return await m.reply(lang.PNF_ALERT);
    }
  }
});

Zoe({
  pattern: "remove",
  fromMe: true,
  desc: lang.REMOVE_DESC,
  type: "server",
}, async (message, match) => {
  if (!match) return await message.reply(lang.NPN_ALERT);
  const pluginPath = __dirname + "/" + match + ".js";
  const pluginName = await dbController.delete("plugin", match);
  if (!fs.existsSync(pluginPath) && !pluginName) return await message.reply(lang.PNF_ALERT);
  try {
    delete require.cache[require.resolve(pluginPath)];
  } catch {}
  if (fs.existsSync(pluginPath)) fs.unlinkSync(pluginPath);
  await message.reply(format(lang.PRS_ALERT, { match }));
  return await restart();
});