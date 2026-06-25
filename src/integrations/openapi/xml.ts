export type XmlRow = Record<string, string>;

export const decodeXmlText = (value: string): string =>
  value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

export const extractXmlTag = (xml: string, tagName: string): string | null => {
  const tagPattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = xml.match(tagPattern);
  return match?.[1] ? decodeXmlText(match[1]) : null;
};

export const extractXmlRows = (xml: string, rowTag = "item"): XmlRow[] => {
  const rows: XmlRow[] = [];
  const itemPattern = new RegExp(`<${rowTag}[^>]*>([\\s\\S]*?)<\\/${rowTag}>`, "gi");
  const tagPattern = /<([A-Za-z][\w.-]*)[^>]*>([\s\S]*?)<\/\1>/g;

  for (const itemMatch of xml.matchAll(itemPattern)) {
    const row: XmlRow = {};
    const itemXml = itemMatch[1] || "";

    for (const tagMatch of itemXml.matchAll(tagPattern)) {
      const key = tagMatch[1];
      const rawValue = tagMatch[2] || "";
      if (key) row[key] = decodeXmlText(rawValue.replace(tagPattern, "").trim() || rawValue);
    }

    rows.push(row);
  }

  return rows;
};
