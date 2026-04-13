import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { WillDraft } from "@/lib/types";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 11,
    paddingTop: 70,
    paddingBottom: 70,
    paddingHorizontal: 80,
    lineHeight: 1.7,
    color: "#0e0e0e",
  },
  label: {
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#9ca3af",
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  disclaimer: {
    fontSize: 9,
    color: "#9ca3af",
    fontStyle: "italic",
    marginBottom: 36,
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    marginTop: 20,
  },
  text: {
    marginBottom: 8,
    color: "#4a5568",
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    marginTop: 30,
    marginBottom: 30,
  },
  personalMessage: {
    fontSize: 12,
    lineHeight: 1.8,
    color: "#0e0e0e",
    fontStyle: "italic",
  },
});

interface Props {
  draft: WillDraft;
}

export function PersonalLetterDocument({ draft }: Props) {
  const f = draft.funeralWishes;
  const name = draft.testatorName || "Avsändaren";
  const today = new Date().toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const letterFromChat = draft.personalLetter?.body?.trim();

  const burialLabels: Record<string, string> = {
    burial: "Jordbegravning",
    cremation: "Kremering",
    no_preference: "Ingen preferens",
  };

  const ceremonyLabels: Record<string, string> = {
    religious: "Religiös ceremoni",
    civil: "Borgerlig ceremoni",
    own: "Personlig ceremoni",
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.label}>Personligt brev</Text>
        <Text style={styles.title}>Ett brev från {name}</Text>
        <Text style={styles.disclaimer}>
          Detta är inte ett juridiskt dokument — det är en gåva till dem jag älskar.
          Skrivet den {today}.
        </Text>

        {letterFromChat ? (
          <View>
            <Text style={styles.personalMessage}>{letterFromChat}</Text>
          </View>
        ) : null}

        {!letterFromChat && (f.burialForm || f.ceremony) && (
          <View>
            <Text style={styles.sectionTitle}>Begravning</Text>
            {f.burialForm && f.burialForm !== "no_preference" && (
              <Text style={styles.text}>{burialLabels[f.burialForm] || f.burialForm}</Text>
            )}
            {f.ceremony && (
              <Text style={styles.text}>{ceremonyLabels[f.ceremony] || f.ceremony}</Text>
            )}
          </View>
        )}

        {!letterFromChat && f.music && (
          <View>
            <Text style={styles.sectionTitle}>Musik</Text>
            <Text style={styles.text}>{f.music}</Text>
          </View>
        )}

        {!letterFromChat && f.clothing && (
          <View>
            <Text style={styles.sectionTitle}>Klädsel</Text>
            <Text style={styles.text}>{f.clothing}</Text>
          </View>
        )}

        {!letterFromChat && f.flowersOrCharity && (
          <View>
            <Text style={styles.sectionTitle}>Blommor eller insamling</Text>
            <Text style={styles.text}>
              {f.flowersOrCharity === "flowers" ? "Blommor" : `Insamling${f.charityName ? ` till ${f.charityName}` : ""}`}
            </Text>
          </View>
        )}

        {!letterFromChat && f.speakers && (
          <View>
            <Text style={styles.sectionTitle}>Tal</Text>
            <Text style={styles.text}>{f.speakers}</Text>
          </View>
        )}

        {!letterFromChat && f.location && (
          <View>
            <Text style={styles.sectionTitle}>Plats</Text>
            <Text style={styles.text}>{f.location}</Text>
          </View>
        )}

        {!letterFromChat && f.personalMessage && (
          <View>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Till er jag lämnar efter mig</Text>
            <Text style={styles.personalMessage}>{f.personalMessage}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
