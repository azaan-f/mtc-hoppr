

export const mockResults = {
  "demo-scan-1": {
    finding_summary: "No significant abnormalities detected",
    detailed_explanation:
      "The AI analysis of your chest X-ray shows clear lung fields with no signs of pneumonia, fluid accumulation, or masses. The heart size appears normal, and the bone structures are intact. This is a reassuring finding that suggests no acute issues requiring immediate attention.",
    confidence_score: 92.5,
    severity: "normal",
    recommended_actions:
      "Continue with your current health routine. If you develop new symptoms such as persistent cough, chest pain, or difficulty breathing, please consult your healthcare provider.",
    follow_up_needed: false,
    follow_up_urgency: "none",
  },
}

export const mockScans = {
  "demo-scan-1": {
    image_type: "X-Ray",
    body_part: "Chest",
    uploaded_at: new Date().toISOString(),
    image_url: "/chest-xray-medical-scan.jpg",
  },
}
