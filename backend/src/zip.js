// zip.js — minimal streaming ZIP writer (STORE method, no compression).
//
// Exists so "download all of this task's documents as a zip" needs no new
// npm dependency. STORE costs nothing here: the payloads are PDFs, JPEGs and
// XLSX files, all of which are already compressed — deflating them again buys
// a percent or two for a lot of CPU.
//
// Each entry is written as a local header + raw bytes, then a central
// directory at the end. Entries are buffered one at a time (a task document
// is capped at 25 MB on upload), never the whole archive.
//
// Limitation: this emits classic (non-Zip64) records, so it is valid up to
// 4 GB per entry and 4 GB per archive. buildZip throws rather than emit a
// silently corrupt archive if either limit is crossed.

const MAX_ZIP32 = 0xffffffff;

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

// MS-DOS date/time, the only timestamp a classic ZIP record carries.
function dosDateTime(date) {
  const d = date instanceof Date && !isNaN(date) ? date : new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2));
  const day = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, day };
}

// Strips path separators and anything a filesystem would object to, and keeps
// names unique so two uploads called "statement.pdf" don't collide in the zip.
function makeUniqueName(raw, used) {
  let name = String(raw || "file")
    .replace(/[\\/]+/g, "_")
    .replace(/[\x00-\x1f<>:"|?*]/g, "_")
    .trim() || "file";
  if (!used.has(name)) { used.add(name); return name; }

  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let n = 2;
  while (used.has(`${stem} (${n})${ext}`)) n++;
  const unique = `${stem} (${n})${ext}`;
  used.add(unique);
  return unique;
}

/**
 * Build a ZIP archive from in-memory entries.
 *
 * @param {Array<{name: string, data: Buffer, date?: Date}>} entries
 * @returns {Buffer}
 */
function buildZip(entries) {
  const used = new Set();
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const entry of entries) {
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    if (data.length > MAX_ZIP32) {
      throw new Error(`"${entry.name}" is too large for a non-Zip64 archive`);
    }
    const name = Buffer.from(makeUniqueName(entry.name, used), "utf8");
    const { time, day } = dosDateTime(entry.date);
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);  // local file header signature
    local.writeUInt16LE(20, 4);          // version needed
    local.writeUInt16LE(0x0800, 6);      // flags: UTF-8 names
    local.writeUInt16LE(0, 8);           // method: store
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18); // compressed size
    local.writeUInt32LE(data.length, 22); // uncompressed size
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);           // extra field length

    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0); // central directory signature
    header.writeUInt16LE(20, 4);         // version made by
    header.writeUInt16LE(20, 6);         // version needed
    header.writeUInt16LE(0x0800, 8);
    header.writeUInt16LE(0, 10);
    header.writeUInt16LE(time, 12);
    header.writeUInt16LE(day, 14);
    header.writeUInt32LE(crc, 16);
    header.writeUInt32LE(data.length, 20);
    header.writeUInt32LE(data.length, 24);
    header.writeUInt16LE(name.length, 28);
    header.writeUInt16LE(0, 30);         // extra
    header.writeUInt16LE(0, 32);         // comment
    header.writeUInt16LE(0, 34);         // disk number start
    header.writeUInt16LE(0, 36);         // internal attrs
    header.writeUInt32LE(0, 38);         // external attrs
    header.writeUInt32LE(offset, 42);    // offset of local header

    chunks.push(local, name, data);
    central.push(header, name);
    offset += local.length + name.length + data.length;
    if (offset > MAX_ZIP32) throw new Error("Archive is too large for a non-Zip64 ZIP");
  }

  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);        // end of central directory
  end.writeUInt16LE(0, 4);                 // this disk
  end.writeUInt16LE(0, 6);                 // disk with central dir
  end.writeUInt16LE(entries.length, 8);    // entries on this disk
  end.writeUInt16LE(entries.length, 10);   // total entries
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);                // comment length

  return Buffer.concat([...chunks, centralBuf, end]);
}

module.exports = { buildZip, crc32 };
