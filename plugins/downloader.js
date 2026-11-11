const {
  Zoe, mode, isYouTubeUrl, ytdl, tikdl,
  isTikTokUrl, extractUrl, yts
} = require("../lib/Index");
let { getString } = require("./func/lang");
const hIG = require("./func/ig");
let lang = getString("downloader");

Zoe({
  pattern: "insta",
  alias: ["story"],
  fromMe: mode,
  desc: lang.INSTA_DESC,
  type: "downloader",
}, async (m, q) => hIG(m, q, "Instagram Downloader"));

Zoe({
  pattern: "ytv",
  fromMe: mode,
  desc: lang.YTV_DESC,
  type: "downloader",
}, async (m, q) => ytdlFn(m, q, "video"));

Zoe({
  pattern: "yta",
  fromMe: mode,
  desc: lang.YTV_DESC,
  type: "downloader",
}, async (m, q) => ytdlFn(m, q, "audio"));

Zoe({
  pattern: "tiktok",
  alias: ["tik"],
  fromMe: mode,
  desc: "Download TikTok videos",
  type: "downloader",
}, async (m, text) => {
  try {
    let url = extractUrl(text);
    if (!url && m.reply_message) {
      const replyText = m.reply_message.text || m.reply_message.body || m.reply_message.caption || "";
      url = extractUrl(replyText);
    }
    if (!url) return m.reply("Please provide a TikTok URL or reply to a message containing a TikTok URL.");
    if (!isTikTokUrl(url)) return m.reply("Please provide a valid TikTok URL.");

    await m.reply("Downloading TikTok video...");
    const result = await tikdl(url);
    if (!result.status || !result.data) {
      return m.reply(`TikTok download failed.\n\n${typeof result.error === "string" ? result.error : "Unable to extract the video."}`);
    }

    const data = result.data;
    const videoUrl = data.hdDownloadUrl || data.downloadUrl || data.url;
    if (!videoUrl) return m.reply("Unable to find a downloadable TikTok video.");

    await m.client.sendMessage(m.jid, {
      video: { url: videoUrl },
      mimetype: "video/mp4",
      caption: data.title || "TikTok Video",
    }, { quoted: m.data });
  } catch (error) {
    console.error("TikTok downloader error:", error);
    return m.reply(`TikTok download failed.\n\n${error.message || "Unknown error."}`);
  }
});

Zoe({
  pattern: "play",
  fromMe: mode,
  desc: "yt search and download",
  type: "downloader",
}, async (m, match, client) => {
  match = match || m.reply_message?.text;
  if (!match) return m.reply("*Need a Query to search*");

  const results = await yts(match);
  if (!results?.length) return m.reply("No result found");

  const formatDuration = (duration) => {
    if (typeof duration === "number") {
      const h = Math.floor(duration / 3600);
      const min = Math.floor((duration % 3600) / 60);
      const sec = duration % 60;
      return h ? `${h}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${min}:${String(sec).padStart(2, "0")}`;
    }
    return duration || "Unknown";
  };

  const d = results[0];
  const caption =
    `╭╺╺╺╺╺╡ 𝗦𝗲𝗮𝗿𝗰𝗵 𝗿𝗲𝘀𝘂𝗹𝘁\n\n` +
    ` 𝗧𝗶𝘁𝗹𝗲: _${d.title || "Unknown"}_\n` +
    ` 𝗔𝘂𝘁𝗵𝗼𝗿: _${d.author || "Unknown"}_\n` +
    ` 𝗩𝗶𝗲𝘄𝘀: _${d.views || "Unknown"}_\n` +
    ` 𝗗𝘂𝗿𝗮𝘁𝗶𝗼𝗻: _${formatDuration(d.durationSeconds || d.duration)}_\n` +
    ` 𝗥𝗲𝗹𝗲𝗮𝘀𝗲: _${d.publishedTime || d.publishDate || "Unknown"}_\n` +
    ` 𝗖𝗵𝗮𝗻𝗻𝗲𝗹: _${d.ownerChannelName || d.author || "Unknown"}_\n` +
    ` 𝗟𝗶𝗻𝗸: _${d.url}_\n\n` +
    ` \`\`\`𝟭:\`\`\` 𝗔𝘂𝗱𝗶𝗼\n` +
    ` \`\`\`𝟮:\`\`\` 𝗩𝗶𝗱𝗲𝗼\n\n` +
    ` *Send a number as a reply to download*\n\n` +
    `╰╺╺╺╺╺╺╺╺╺╺╡`;

  return client.sendMessage(m.jid, {
    image: { url: d.thumbnail || d.image },
    caption,
  });
});

Zoe({
  on: "text",
  fromMe: true,
  dontAddCommandList: true,
}, async (m, match, client) => {
  const text = match?.trim();
  const reply = m.reply_message;
  const replyText = reply?.text;

  if (
    !/^[12]$/.test(text || "") ||
    !reply ||
    !reply.fromMe ||
    !replyText?.includes("𝗦𝗲𝗮𝗿𝗰𝗵 𝗿𝗲𝘀𝘂𝗹𝘁") ||
    !replyText.includes("𝗟𝗶𝗻𝗸: _") ||
    !replyText.includes("```𝟭:``` 𝗔𝘂𝗱𝗶𝗼") ||
    !replyText.includes("```𝟮:``` 𝗩𝗶𝗱𝗲𝗼")
  ) return;

  const url = replyText.match(/𝗟𝗶𝗻𝗸:\s*_(https?:\/\/[^\s]+)_/)?.[1];
  if (!url) return;

  const type = text === "1" ? "audio" : "video";
  const audio = type === "audio";
  const msg = await m.reply("Downloading, please wait few sec...");

  try {
    const d = await ytdl(url, audio ? "mp3" : "mp4", audio ? 320 : 720);
    if (!d?.url) throw new Error("Download URL unavailable.");

    return client.sendMessage(m.jid, {
      [type]: { url: d.url },
      mimetype: audio ? "audio/mpeg" : "video/mp4",
      fileName: d.title,
    }, { quoted: m.data });
  } catch (error) {
    console.error("YouTube download error:", error);
    return msg.edit("Download failed. Please try again.");
  }
});

async function ytdlFn(m, q, type = "audio") {
  if (!q) return m.reply(lang.IVM_ALERT);
  if (!isYouTubeUrl(q)) return m.reply(lang.YL_ALERT);

  const audio = type === "audio";
  const d = await ytdl(q, audio ? "mp3" : "mp4", audio ? 320 : 720);
  if (!d?.status || !d.url) return m.reply("Download failed.");

  return m.client.sendMessage(m.jid, {
    [audio ? "audio" : "video"]: { url: d.url },
    mimetype: audio ? "audio/mpeg" : "video/mp4",
    fileName: d.title,
  }, { quoted: m.data });
}