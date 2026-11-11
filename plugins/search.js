const { Zoe, mode, findMusic, yts, getBuffer, PREFIX, cutMedia } = require("../lib/Index");
const { getString } = require("./func/lang");

const lang = getString("search");

Zoe({
  pattern: "find",
  alias: ["track"],
  fromMe: mode,
  desc: lang.FIND_DESC,
  type: "search",
}, async (m, match, client) => {
  if (!m.reply_message) return m.reply(lang.AV_ALERT);
  if (!["videoMessage", "audioMessage"].includes(m.reply_message.type)) return m.reply(lang.NAV_ALERT);
  const buff = await m.reply_message.download();
  const isAudio = m.reply_message.type === "audioMessage";
  const duration = Number(m.reply_message.duration || 0);
  const media = duration > 35 ? await cutMedia(buff, "0", "30", isAudio) : buff;
  const result = await findMusic(media);
  if (result === "No result") return m.reply(lang.NRF_ALERT);
  const d = result;
  const caption = `╭╺╺╺╡ 𝗙𝗶𝗻𝗱 𝗠𝘂𝘀𝗶𝗰\n\n 𝗧𝗶𝘁𝗹𝗲: _${d.title}_\n 𝗔𝗿𝘁𝗶𝘀𝘁𝘀: _${d.artists}_\n 𝗔𝗹𝗯𝘂𝗺: _${d.album}_\n 𝗚𝗲𝗻𝗿𝗲𝘀: _${d.genres}_\n 𝗥𝗲𝗹𝗲𝗮𝘀𝗲: _${d.release_date}_\n 𝗟𝗶𝗻𝗸: ${d.spotify}\n\n╰╺╺╺╺╺╺╺╡`;
  return await client.sendMessage(m.jid, { text: caption }, { quoted: m.data });
});

Zoe({
  pattern: "yts",
  alias: ["ytsearch"],
  fromMe: mode,
  desc: lang.YTS_DESC,
  type: "search",
}, async (m, match, client) => {
  match = match || m.reply_message?.text;
  if (!match) return m.reply(lang.NQS_ALERT);
  const results = await yts(match);
  if (!results?.length) return m.reply(lang.NRF_ALERT);
  const formatDuration = duration => {
    if (typeof duration === "number") {
      const h = Math.floor(duration / 3600);
      const min = Math.floor((duration % 3600) / 60);
      const sec = duration % 60;
      return h ? `${h}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${min}:${String(sec).padStart(2, "0")}`;
    }
    return duration || "Unknown";
  };
  if (results.length === 1) {
    const d = results[0];
    const caption = `╭╺╺╺╺╺╡ 𝗦𝗲𝗮𝗿𝗰𝗵 𝗿𝗲𝘀𝘂𝗹𝘁\n\n 𝗧𝗶𝘁𝗹𝗲: _${d.title || "Unknown"}_\n 𝗔𝘂𝘁𝗵𝗼𝗿: _${d.author || "Unknown"}_\n 𝗩𝗶𝗲𝘄𝘀: _${d.views || "Unknown"}_\n 𝗗𝘂𝗿𝗮𝘁𝗶𝗼𝗻: _${formatDuration(d.durationSeconds || d.duration)}_\n 𝗥𝗲𝗹𝗲𝗮𝘀𝗲: _${d.publishedTime || d.publishDate || "Unknown"}_\n 𝗖𝗵𝗮𝗻𝗻𝗲𝗹: _${d.ownerChannelName || d.author || "Unknown"}_\n 𝗟𝗶𝗻𝗸: _${d.url}_\n\n \`\`\`𝟭:\`\`\` 𝗔𝘂𝗱𝗶𝗼\n \`\`\`𝟮:\`\`\` 𝗩𝗶𝗱𝗲𝗼\n\n *Send a number as a reply to download*\n\n╰╺╺╺╺╺╺╺╺╺╺╡`;
    return client.sendMessage(m.jid, { image: { url: d.thumbnail || d.image }, caption }, { quoted: m.data });
  }
  const values = results.slice(0, 10).map((d, i) => ({
    name: `${i + 1}. ${d.title}\n👤 ${d.author}\n⏱ ${formatDuration(d.duration)} | 📅 ${d.publishedTime || "Unknown"}`,
    id: `${PREFIX}play ${d.url}`,
  }));
  return m.sendPoll(m.jid, {
    name: `*YouTube Search Results*\n`,
    values,
    withPrefix: true,
    onlyOnce: false,
    participates: [m.sender],
    selectableCount: true,
  });
});