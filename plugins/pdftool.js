const { Zoe, mode } = require("../lib/Index");
const { DEFAULTS, safeString, getHelpText, parseArgs, normalizeOptions, ensurePdfExtension, sanitizeFilename, getImageInfo, getDocumentInfo, getStoredImage, parseTimeToMs, listStoredImages, setTTL, formatDuration, hasKey, downloadQuoted, validateImageBuffer, normalizeImage, storeImage, getTTL, deleteImage, deleteAllImages, humanAgo, sendImageMessage, isTextDocument, parseTextFile, hasImageMarker, createImagePdf, generatePdfFromText, sendPdf, generateAutoKey } = require("../lib/PdfManager");

Zoe({
  pattern: "pdftool",
  fromMe: mode,
  desc: "Full featured local PDF generator",
  type: "converter",
}, async (m, text) => {
  try {
    const input = safeString(text).trim();
    if (!input || ["help", "-h", "--help"].includes(input)) return m.reply(getHelpText());
    let working = input;
    let forcedMode = null;
    const modeMatch = working.match(/^(image|img|txt|textfile)(?=\s|$)([\s\S]*)$/i);
    if (modeMatch) {
      const rest = (modeMatch[2] || "").trim();
      if (!rest || rest.startsWith("-")) {
        forcedMode = modeMatch[1].toLowerCase();
        working = rest;
      }
    }
    const parsed = parseArgs(working);
    if (parsed.options.help) return m.reply(getHelpText());
    const options = normalizeOptions({ ...DEFAULTS, ...parsed.options });
    options.output = ensurePdfExtension(sanitizeFilename(options.output));
    const jid = m.jid;
    const resolveImage = key => getStoredImage(jid, key);
    const imageInfo = getImageInfo(m);
    const documentInfo = getDocumentInfo(m);

    if (options.setautodelete !== undefined) {
      if (options.setautodelete === true) return m.reply('Provide a duration.\n\nExamples:\n.pdftool --setautodelete"30sec"\n.pdftool --setautodelete"15min"\n.pdftool --setautodelete"1hour"\n.pdftool --setautodelete"off"');
      const ms = parseTimeToMs(options.setautodelete);
      if (ms === null) return m.reply('Invalid duration. Use e.g. "30sec", "10min", "1hour" or "off".\nMinimum 5s, maximum 1 hour.');
      const existing = listStoredImages(jid).length;
      setTTL(jid, ms);
      return m.reply((ms ? `Auto-delete set to ${formatDuration(ms)} for this chat.` : "Auto-delete disabled for this chat.") + (existing ? `\nUpdated ${existing} existing image(s).` : ""));
    }

    if (options.saveimageas) {
      if (!imageInfo) return m.reply('Reply to an image to save it.\n\nExample:\n.pdftool --saveimageas"1"');
      let key = safeString(options.saveimageas).trim();
      if (typeof options.saveimageas === "boolean" || !/^[A-Za-z0-9_-]+$/i.test(key)) return m.reply("Invalid image key. Use letters, numbers, underscore or dash only.");
      if (key.toLowerCase() === "auto") key = generateAutoKey(jid);
      const exists = hasKey(jid, key);
      if (exists && !options.overwrite) return m.reply(`Key "${key}" already exists.\n\n• Use a different key, or\n• add --overwrite to replace it, or\n• --deleteimage"${key}" first.`);
      await m.reply(`Saving image as "${key}"...`);
      const buf = await downloadQuoted(m);
      const meta = await validateImageBuffer(buf);
      if (!meta) return m.reply("The replied file does not appear to be a valid image.");
      const normalized = await normalizeImage(buf);
      storeImage(jid, key, normalized);
      const ttl = getTTL(jid);
      return m.reply(`Image saved as "${key}"${exists ? " (replaced)" : ""}.\nAuto-delete: ${ttl ? formatDuration(ttl) : "disabled"}\nUse --useimage"${key}" inside your text to place it.`);
    }

    if (options.deleteimage) {
      const key = safeString(options.deleteimage).trim();
      const ok = deleteImage(jid, key);
      return m.reply(ok ? `Deleted image "${key}".` : `No saved image found with key "${key}".`);
    }

    if (options.deleteallimages) {
      const n = deleteAllImages(jid);
      return m.reply(n ? `Deleted ${n} saved image(s).` : "No saved images to delete.");
    }

    if (options.seeimage) {
      const key = safeString(options.seeimage).trim();
      const entry = getStoredImage(jid, key);
      if (!entry) return m.reply(`No saved image found with key "${key}".`);
      const ttlLeft = entry.expiresAt ? entry.expiresAt - Date.now() : 0;
      const caption = `Key: ${key}\nSaved: ${humanAgo(entry.savedAt)}\n${entry.expiresAt ? `Expires in: ${formatDuration(ttlLeft)}` : "Never expires"}`;
      return sendImageMessage(m, entry.buffer, caption);
    }

    if (options.seeallimages) {
      const list = listStoredImages(jid);
      if (!list.length) return m.reply("No saved images in this chat.");
      for (const entry of list) {
        try {
          const ttlLeft = entry.expiresAt ? entry.expiresAt - Date.now() : 0;
          const caption = `Key: ${entry.key}\nSaved: ${humanAgo(entry.savedAt)}\n${entry.expiresAt ? `Expires in: ${formatDuration(ttlLeft)}` : "Never expires"}`;
          await sendImageMessage(m, entry.buffer, caption);
        } catch (err) {
          console.error("[PDFTOOL seeallimages]", err);
        }
      }
      return;
    }

    if (options.listimages) {
      const list = listStoredImages(jid);
      if (!list.length) return m.reply("No saved images in this chat.");
      const lines = list.map((e, i) => {
        const ttlLeft = e.expiresAt ? e.expiresAt - Date.now() : 0;
        const exp = e.expiresAt ? formatDuration(ttlLeft) : "never";
        return `${i + 1}. "${e.key}"  saved ${humanAgo(e.savedAt)}  expires in ${exp}`;
      });
      const ttl = getTTL(jid);
      return m.reply(`Saved images (${list.length}):\n\n${lines.join("\n")}\n\nAuto-delete: ${ttl ? formatDuration(ttl) : "disabled"}`);
    }

    const lowerText = parsed.text.toLowerCase();
    const imageMode = forcedMode === "image" || forcedMode === "img" || lowerText === "image" || lowerText === "img";
    const txtMode = forcedMode === "txt" || forcedMode === "textfile" || lowerText === "txt" || lowerText === "textfile";

    if (imageMode || (imageInfo && !parsed.text)) {
      if (!imageInfo) return m.reply("Reply to an image first.\n\nExample:\n.pdftool image");
      await m.reply("Creating PDF from image...");
      const imageBuffer = await downloadQuoted(m);
      const meta = await validateImageBuffer(imageBuffer);
      if (!meta) return m.reply("The replied file does not appear to be a valid image.");
      const pdf = await createImagePdf(imageBuffer, options);
      return sendPdf(m, pdf, options.output);
    }

    if (txtMode || (documentInfo && !parsed.text)) {
      if (!documentInfo) return m.reply("Reply to a .txt document first.\n\nExample:\n.pdftool txt");
      if (!isTextDocument(documentInfo)) {
        const filename = safeString(documentInfo?.fileName).toLowerCase();
        const mimetype = safeString(documentInfo?.mimetype).toLowerCase();
        return m.reply("The quoted document is not a TXT/text file.\n\n" + `Detected name: ${filename || "(unknown)"}\nDetected type: ${mimetype || "(unknown)"}`);
      }
      await m.reply("Reading text file and creating PDF...");
      const textBuffer = await downloadQuoted(m);
      const rawFile = textBuffer.toString("utf8");
      if (!rawFile.trim()) return m.reply("The text file is empty.");
      const fileParsed = parseTextFile(rawFile);
      const txtOptions = normalizeOptions({ ...DEFAULTS, ...fileParsed.options, ...parsed.options });
      txtOptions.output = ensurePdfExtension(sanitizeFilename(txtOptions.output));
      let fileText = fileParsed.text;
      if (imageInfo && !hasImageMarker(fileText)) {
        const buf = await downloadQuoted(m);
        const meta = await validateImageBuffer(buf);
        if (!meta) return m.reply("The replied file does not appear to be a valid image.");
        const normalized = await normalizeImage(buf);
        storeImage(jid, "reply", normalized);
        fileText = txtOptions.imagepos === "before" ? `--useimage"reply"\n` + fileText : fileText + `\n--useimage"reply"`;
      }
      if (!fileText.trim() && !hasImageMarker(fileText)) return m.reply("The text file has no body content after config was removed.");
      const pdf = await generatePdfFromText(fileText, txtOptions, resolveImage);
      return sendPdf(m, pdf, txtOptions.output);
    }

    let documentText = parsed.text;
    documentText = documentText.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
    if (!documentText.trim()) return m.reply("Provide text to convert.\n\nExample:\n.pdftool Hello World");
    if (imageInfo) {
      const buf = await downloadQuoted(m);
      const meta = await validateImageBuffer(buf);
      if (!meta) return m.reply("The replied file does not appear to be a valid image.");
      const normalized = await normalizeImage(buf);
      storeImage(jid, "reply", normalized);
      if (!hasImageMarker(documentText)) documentText = options.imagepos === "before" ? `--useimage"reply"\n` + documentText : documentText + `\n--useimage"reply"`;
    }
    const MAX_TEXT_LENGTH = 2 * 1024 * 1024;
    if (Buffer.byteLength(documentText, "utf8") > MAX_TEXT_LENGTH) return m.reply("Text is too large for one command. Maximum is 2 MB.");
    await m.reply("Generating PDF...");
    const pdf = await generatePdfFromText(documentText, options, resolveImage);
    return sendPdf(m, pdf, options.output);
  } catch (error) {
    console.error("[PDFTOOL]", error);
    return m.reply(`PDF generation failed.\n\n${error.message || error}`);
  }
});