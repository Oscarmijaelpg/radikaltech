export function processCitations(
  content: string,
  idPrefix: string,
  newsArray: unknown[] = [],
): string {
  if (!content) return '';
  const sourceMap: Record<string, string> = {};

  if (newsArray && newsArray.length > 0) {
    (newsArray as Record<string, string>[]).forEach((item, index) => {
      const num = (index + 1).toString();
      const url =
        item.url ||
        item.link ||
        item.url_fuente ||
        (typeof item.source === 'string' && item.source.startsWith('http') ? item.source : null);
      if (url) sourceMap[num] = url;
    });
  }

  content.split('\n').forEach((line) => {
    const numMatch = line.match(/^\s*(?:[-*+]\s*)?(?:\[)?(\d+)(?:\])?[.):\-\s]+/);
    if (numMatch?.[1]) {
      const num = numMatch[1];
      const urlMatch = line.match(/(https?:\/\/[^\s)\]'"<>]+)/);
      if (urlMatch?.[1]) sourceMap[num] = urlMatch[1];
    }
  });

  const refRegex = /\[(\d+)\]:\s*(https?:\/\/[^\s)\]'"<>]+)/g;
  let match;
  while ((match = refRegex.exec(content)) !== null) {
    if (match[1] && match[2]) sourceMap[match[1]] = match[2];
  }

  let text = content;

  text = text.replace(
    /^(\s*(?:[-*+]\s*)?(?:\[)?(\d+)(?:\])?[.):\-\s]+)(.*?)(https?:\/\/[^\s)\]'"<>]+)(.*?)$/gm,
    (fullLine, prefix, _num, titlePart, url, rest) => {
      if (fullLine.includes(`](${url})`)) return fullLine;
      const cleanTitle = titlePart.replace(/[-–:]\s*$/, '').trim();
      return `${prefix}${cleanTitle ? cleanTitle + ' — ' : ''}[${url}](${url})${rest}`;
    },
  );

  text = text.replace(/\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g, (_ogMatch, numsStr) => {
    const nums = numsStr.split(',').map((n: string) => n.trim());
    const links = nums.map((n: string) => {
      const url = sourceMap[n];
      if (url) return `[${n}](${url})`;
      return `[${n}](#source-${idPrefix}-${n})`;
    });
    return links.join(' ');
  });

  return text;
}
