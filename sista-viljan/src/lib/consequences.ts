import type { Circumstances, ConsequenceInfo } from "./types";

export function getConsequences(c: Circumstances): ConsequenceInfo[] {
  const results: ConsequenceInfo[] = [];

  if (!c.familyStatus && !c.childrenStatus) {
    return [
      {
        title: "Vad händer utan testamente?",
        current:
          "Utan testamente fördelas arvet enligt Ärvdabalken. Det kan innebära att dina önskemål inte respekteras.",
        withWill: "Med ett testamente bestämmer du själv vem som ärver vad.",
      },
    ];
  }

  // Sambo scenario
  if (c.familyStatus === "sambo") {
    results.push({
      title: "Din sambo",
      current:
        "Som sambo ärver din partner ingenting enligt svensk lag. Arvet går till dina barn eller föräldrar.",
      withWill:
        "Med ett testamente kan du se till att din sambo ärver det du önskar — upp till fri kvot.",
    });
  }

  // Married scenario
  if (c.familyStatus === "married") {
    if (c.childrenStatus === "from_previous" || c.childrenStatus === "both") {
      results.push({
        title: "Särkullbarn",
        current:
          "Dina barn från tidigare relation har rätt att kräva ut sin laglott direkt — din partner kan tvingas lämna ifrån sig delar av er gemensamma egendom.",
        withWill:
          "Med rätt formulering kan du ge din partner rätt att bo kvar och nyttja er egendom under sin livstid.",
      });
    } else {
      results.push({
        title: "Din make/maka",
        current:
          "Din make/maka ärver allt med fri förfoganderätt. Era gemensamma barn ärver efter er båda.",
        withWill:
          "Du kan specificera vad som ska hända om ni båda går bort, och skydda arvet mot framtida omgifte.",
      });
    }
  }

  // Children
  if (c.childrenStatus === "none" && c.familyStatus === "sambo") {
    results.push({
      title: "Utan barn",
      current:
        "Utan barn och utan testamente ärver dina föräldrar, och i deras frånvaro dina syskon.",
      withWill:
        "Du kan säkerställa att din sambo ärver hela din kvarlåtenskap.",
    });
  }

  if (c.childrenStatus === "joint") {
    results.push({
      title: "Era gemensamma barn",
      current:
        "Gemensamma barn ärver efter den längst levande föräldern — det är oftast det ni önskar.",
      withWill:
        "Du kan ange att arvet ska vara barnens enskilda egendom, skyddat vid en eventuell skilsmässa.",
    });
  }

  // Assets
  if (c.assets?.includes("business")) {
    results.push({
      title: "Ditt företag",
      current:
        "Utan testamente kan ditt företag behöva delas upp bland arvingar som kanske inte vill eller kan driva det vidare.",
      withWill:
        "Du kan utse vem som ska ta över företaget och på vilka villkor.",
    });
  }

  if (c.assets?.includes("vacation_home")) {
    results.push({
      title: "Fritidshuset",
      current:
        "Utan testamente kan fritidshuset tvingas säljas för att alla arvingar ska kunna få sin del.",
      withWill:
        "Du kan ange att en specifik person ska ha rätt att lösa ut de andra och behålla huset.",
    });
  }

  // Charity
  if (c.outsideFamily === "charity") {
    results.push({
      title: "Välgörenhet",
      current:
        "Utan testamente går arvet enbart till dina lagliga arvingar — inget till organisationer.",
      withWill:
        "Du kan testamentera en specifik summa eller andel till valfri organisation.",
    });
  }

  if (c.outsideFamily === "person") {
    results.push({
      title: "Vän eller annan släkt",
      current:
        "Utan testamente har en vän eller mer avlägsen släkting ingen arvsrätt.",
      withWill: "Du kan ge dem precis vad du önskar inom ramen för laglotten.",
    });
  }

  if (results.length === 0) {
    results.push({
      title: "Din situation",
      current: "Utan testamente följer arvet lagens ordning.",
      withWill: "Med ett testamente tar du kontrollen.",
    });
  }

  return results;
}
