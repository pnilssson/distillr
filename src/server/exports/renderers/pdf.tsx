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
  },
  title: {
    fontSize: 18,
    marginBottom: 10,
  },
  heading: {
    fontSize: 13,
    marginBottom: 6,
    marginTop: 12,
  },
  paragraph: {
    marginBottom: 4,
  },
  metadataLine: {
    marginBottom: 4,
  },
  section: {
    marginTop: 4,
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
            <Text style={styles.heading}>Metadata</Text>
            {document.metadataLines.map((line, index) => (
              <Text key={`metadata-${index}`} style={styles.metadataLine}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}

        {document.sections.map((section, sectionIndex) => (
          <View key={`section-${sectionIndex}`} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            {section.lines.map((line, index) => (
              <LineText key={`${section.heading}-${index}`} line={line} />
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}

function LineText({ line }: { line: string }) {
  const trimmed = line.trim();

  if (trimmed.length === 0) {
    return <Text style={styles.paragraph}> </Text>;
  }

  if (/^https?:\/\//.test(trimmed)) {
    return (
      <Link src={trimmed} style={styles.paragraph}>
        {trimmed}
      </Link>
    );
  }

  return <Text style={styles.paragraph}>{line}</Text>;
}
