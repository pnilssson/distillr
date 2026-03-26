import "server-only";

import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  renderToStream,
} from "@react-pdf/renderer";

import type { ExportDocument } from "@/server/exports/types";

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    fontSize: 11,
    lineHeight: 1.45,
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 18,
    marginBottom: 10,
    fontFamily: "Helvetica-Bold",
  },
  heading: {
    fontSize: 13,
    marginBottom: 6,
    marginTop: 14,
    fontFamily: "Helvetica-Bold",
  },
  metadataLine: {
    fontSize: 10,
    color: "#555555",
    marginBottom: 2,
  },
  paragraph: {
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 4,
  },
  bulletMarker: {
    width: 12,
    fontSize: 11,
  },
  bulletText: {
    flex: 1,
    fontSize: 11,
  },
  subText: {
    fontSize: 10,
    color: "#555555",
    marginBottom: 3,
    paddingLeft: 16,
  },
  section: {
    marginTop: 4,
  },
  separator: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#cccccc",
    marginTop: 10,
    marginBottom: 6,
  },
});

export async function renderExportDocumentAsPdf(document: ExportDocument): Promise<Uint8Array> {
  const stream = await renderToStream(<ExportPdfDocument document={document} />);
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function ExportPdfDocument({ document }: { document: ExportDocument }) {
  return (
    <Document title={document.title}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{document.title}</Text>

        {document.metadataLines.length > 0 ? (
          <View>
            {document.metadataLines.map((line, index) => (
              <Text key={`metadata-${index}`} style={styles.metadataLine}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}

        {document.sections.map((section, sectionIndex) => (
          <View key={`section-${sectionIndex}`} style={styles.section}>
            <View style={styles.separator} />
            <Text style={styles.heading}>{section.heading}</Text>
            {renderSectionLines(section.lines, `section-${sectionIndex}`)}
          </View>
        ))}
      </Page>
    </Document>
  );
}

function renderSectionLines(lines: string[], keyPrefix: string) {
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      elements.push(<Text key={`${keyPrefix}-${i}`} style={styles.paragraph}>{" "}</Text>);
      continue;
    }

    // Sub-text line (indented, not a bullet) — render as smaller, muted text
    if (/^\s{2,}/.test(line) && !line.trimStart().startsWith("- ")) {
      elements.push(
        <Text key={`${keyPrefix}-${i}`} style={styles.subText}>
          {stripMarkdownInline(trimmed)}
        </Text>,
      );
      continue;
    }

    // Bullet line: "- text" or "  - text"
    if (/^\s*- /.test(line)) {
      const bulletContent = line.replace(/^\s*- /, "");
      elements.push(
        <View key={`${keyPrefix}-${i}`} style={styles.bulletRow}>
          <Text style={styles.bulletMarker}>{"\u2022"}</Text>
          <Text style={styles.bulletText}>{stripMarkdownInline(bulletContent)}</Text>
        </View>,
      );
      continue;
    }

    // URL line
    if (/^https?:\/\//.test(trimmed)) {
      elements.push(
        <Link key={`${keyPrefix}-${i}`} src={trimmed} style={styles.paragraph}>
          {trimmed}
        </Link>,
      );
      continue;
    }

    // Regular text
    elements.push(
      <Text key={`${keyPrefix}-${i}`} style={styles.paragraph}>
        {stripMarkdownInline(trimmed)}
      </Text>,
    );
  }

  return elements;
}

/**
 * Strip common markdown inline syntax for plain-text PDF rendering.
 * Handles: **bold**, *italic*, `code`, [text](url) → text (url)
 */
function stripMarkdownInline(text: string): string {
  return text
    // [text](url) → text (url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    // **bold** or __bold__
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    // *italic* or _italic_
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    // `code`
    .replace(/`(.+?)`/g, "$1");
}
