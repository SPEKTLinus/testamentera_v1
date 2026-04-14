import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { WillDraft } from "@/lib/types";
import { buildWillSections } from "@/lib/willTemplate";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 60,
    paddingBottom: 70,
    paddingHorizontal: 70,
    lineHeight: 1.65,
    color: "#0e0e0e",
  },
  title: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: 3,
  },
  preamble: {
    marginBottom: 20,
    textAlign: "justify",
  },
  sectionRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  sectionNum: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    width: 20,
    flexShrink: 0,
  },
  sectionBody: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginBottom: 3,
  },
  sectionText: {
    fontSize: 10,
    textAlign: "justify",
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  bullet: {
    width: 12,
    fontSize: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
  },
  replacementNotice: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 9,
    fontFamily: "Helvetica-Oblique",
    color: "#4a5568",
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
    marginBottom: 20,
  },
  disclaimer: {
    fontSize: 7.5,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 1.5,
  },
  signatureGrid: {
    flexDirection: "row",
    gap: 30,
    marginBottom: 28,
  },
  signatureField: {
    flex: 1,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#0e0e0e",
    paddingBottom: 22,
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 8,
    color: "#6b7280",
  },
  witnessHeader: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#6b7280",
    marginBottom: 10,
    marginTop: 4,
  },
  witnessGrid: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 8,
  },
  witnessCol: {
    flex: 1,
  },
  witnessBlock: {
    marginBottom: 14,
  },
  witnessLineLabel: {
    fontSize: 7.5,
    color: "#9ca3af",
    marginTop: 2,
    marginBottom: 8,
  },
  witnessLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 16,
  },
});

export function LegalWillDocument({ draft }: { draft: WillDraft }) {
  const aiSections = draft.generatedWill?.sections;
  const templateSections = buildWillSections(draft);
  const today = new Date().toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Title */}
        <Text style={styles.title}>TESTAMENTE</Text>
        <Text style={{ fontSize: 8.5, textAlign: "center", color: "#6b7280", marginBottom: 22 }}>
          {today}
        </Text>

        {/* Preamble */}
        <Text style={styles.preamble}>
          {`Jag, `}
          <Text style={{ fontFamily: "Helvetica-Bold" }}>
            {draft.testatorName || "[Namn]"}
          </Text>
          {draft.testatorPersonalNumber?.trim() ? (
            <>
              {` personnummer `}
              <Text style={{ fontFamily: "Helvetica-Bold" }}>
                {draft.testatorPersonalNumber.trim()}
              </Text>
            </>
          ) : null}
          {`, bosatt på `}
          <Text style={{ fontFamily: "Helvetica-Bold" }}>
            {draft.testatorAddress || "[adress]"}
          </Text>
          {`, förordnar härmed följande:`}
        </Text>

        {/* Numbered sections */}
        {aiSections && aiSections.length > 0
          ? aiSections.map((s, i) => (
              <View key={i} style={styles.sectionRow}>
                <Text style={styles.sectionNum}>{i + 1}.</Text>
                <View style={styles.sectionBody}>
                  <Text style={styles.sectionTitle}>{s.title}</Text>
                  {s.text.split(/\n+/).map((para, j) => (
                    <Text key={j} style={[styles.sectionText, { marginBottom: 4 }]}>
                      {para}
                    </Text>
                  ))}
                </View>
              </View>
            ))
          : templateSections.map((s) => (
              <View key={s.number} style={styles.sectionRow}>
                <Text style={styles.sectionNum}>{s.number}.</Text>
                <View style={styles.sectionBody}>
                  <Text style={styles.sectionTitle}>{s.title}</Text>
                  {s.intro ? (
                    <Text style={[styles.sectionText, { marginBottom: 4 }]}>{s.intro}</Text>
                  ) : null}
                  {s.isBulletList ? (
                    s.lines.map((line, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <Text style={styles.bullet}>{"•"}</Text>
                        <Text style={styles.bulletText}>{line}</Text>
                      </View>
                    ))
                  ) : (
                    s.lines.map((line, i) => (
                      <Text key={i} style={styles.sectionText}>
                        {line}
                      </Text>
                    ))
                  )}
                </View>
              </View>
            ))}

        <View style={styles.divider} />

        {/* Signature: testator */}
        <View style={styles.signatureGrid}>
          <View style={styles.signatureField}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>
              {draft.testatorName || "Testators namnteckning"}
            </Text>
          </View>
          <View style={styles.signatureField}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Ort och datum</Text>
          </View>
        </View>

        {/* Witnesses */}
        <Text style={styles.witnessHeader}>Vittnen</Text>
        <View style={styles.witnessGrid}>
          {[1, 2].map((n) => (
            <View key={n} style={styles.witnessCol}>
              <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", marginBottom: 8 }}>
                Vittne {n}
              </Text>
              <View style={styles.witnessBlock}>
                <View style={styles.witnessLine} />
                <Text style={styles.witnessLineLabel}>Namnteckning</Text>
              </View>
              <View style={styles.witnessBlock}>
                <View style={styles.witnessLine} />
                <Text style={styles.witnessLineLabel}>Namnförtydligande och personnummer</Text>
              </View>
              <View style={styles.witnessBlock}>
                <View style={styles.witnessLine} />
                <Text style={styles.witnessLineLabel}>Bostadsadress</Text>
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
