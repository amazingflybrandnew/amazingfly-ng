/**
 * Minimal, dependency-free PDF for an Amazingfly travel insurance confirmation.
 * Sanlam Allianz also emails the official policy certificate; this is the
 * branded Amazingfly confirmation the customer can download and keep.
 */

export type InsuranceCertificateData = {
  contractNumber: string;
  travellerName: string;
  destination: string;
  coverBegins: string;
  coverEnds: string;
  amountPaid: string;
  reference: string;
  issuedOn: string;
};

function escapePdfText(value: string): string {
  return (value || "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildContentStream(data: InsuranceCertificateData): string {
  const rows: Array<[string, string]> = [
    ["Policy / contract number", data.contractNumber],
    ["Traveller", data.travellerName],
    ["Destination", data.destination],
    ["Cover begins", data.coverBegins],
    ["Cover ends", data.coverEnds],
    ["Amount paid", data.amountPaid],
    ["Request reference", data.reference],
    ["Issued on", data.issuedOn],
  ];

  const lines: string[] = [];
  lines.push("BT");
  lines.push("0.055 0.12 0.23 rg");
  lines.push("/F2 22 Tf");
  lines.push("48 780 Td");
  lines.push("(Amazingfly Travels) Tj");
  lines.push("/F2 14 Tf");
  lines.push("0 -26 Td");
  lines.push("(Travel Insurance Confirmation) Tj");
  lines.push("0.42 0.46 0.52 rg");
  lines.push("/F1 10 Tf");
  lines.push("0 -16 Td");
  lines.push("(Underwritten by Sanlam Allianz Nigeria) Tj");
  lines.push("0 -30 Td");

  for (const [label, value] of rows) {
    lines.push("0.42 0.46 0.52 rg");
    lines.push("/F1 10 Tf");
    lines.push(`(${escapePdfText(label)}) Tj`);
    lines.push("0.12 0.16 0.22 rg");
    lines.push("/F2 13 Tf");
    lines.push("0 -16 Td");
    lines.push(`(${escapePdfText(value)}) Tj`);
    lines.push("0 -22 Td");
  }

  lines.push("0.42 0.46 0.52 rg");
  lines.push("/F1 9 Tf");
  lines.push("0 -14 Td");
  lines.push(
    "(Keep this confirmation with your Sanlam Allianz certificate for visa and travel use.) Tj",
  );
  lines.push("ET");
  return lines.join("\n");
}

/** Build a one-page A4 PDF and return its bytes + a filename. */
export function createInsuranceCertificatePdf(
  data: InsuranceCertificateData,
): { filename: string; bytes: Uint8Array } {
  const content = buildContentStream(data);
  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(content);

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] " +
      "/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${contentBytes.length} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(encoder.encode(pdf).length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const safeRef = (data.contractNumber || data.reference || "policy").replace(/[^a-zA-Z0-9._-]/g, "_");
  return { filename: `amazingfly-insurance-${safeRef}.pdf`, bytes: encoder.encode(pdf) };
}
