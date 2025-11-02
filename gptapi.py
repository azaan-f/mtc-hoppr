from openai import OpenAI
from pipeline import run_pipeline
import sys
import os

PROMPT_ID = "pmpt_690700ab592c8193a7c32f25f1e388af060c97f980a6ee4d"
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

def _extract_response_text(resp) -> str:
    try:
        out = getattr(resp, "output", None)
        if out:
            parts = []
            for item in out:
                content = getattr(item, "content", None) or (item.get("content", []) if isinstance(item, dict) else None)
                if content:
                    for c in content:
                        t = getattr(c, "text", None) or (c.get("text") if isinstance(c, dict) else None)
                        if t:
                            parts.append(t)
            if parts:
                return "".join(parts)
    except Exception:
        pass

    try:
        if isinstance(resp, dict):
            if "output" in resp:
                texts = []
                for item in resp["output"]:
                    for c in item.get("content", []):
                        if isinstance(c, dict) and "text" in c:
                            texts.append(c["text"])
                if texts:
                    return "".join(texts)
            if "choices" in resp:
                texts = []
                for c in resp["choices"]:
                    txt = c.get("text") or c.get("message", {}).get("content")
                    if isinstance(txt, list):
                        for block in txt:
                            if isinstance(block, dict) and "text" in block:
                                texts.append(block["text"])
                    elif txt:
                        texts.append(txt)
                if texts:
                    return "\n".join(texts)
    except Exception:
        pass

    try:
        return str(resp)
    except Exception:
        return ""


def main(pipeline_output: str | None = None, dicom_path: str | None = None, questionnaire_data: dict | None = None):
    if pipeline_output:
        formatted_output = pipeline_output
    else:
        if dicom_path is None:
            dicom_path = "Atelectasis/train/0b1b897b1e1e170f1b5fd7aeff553afa.dcm"

        if not os.path.exists(dicom_path):
            raise FileNotFoundError(f"DICOM file not found at: {dicom_path}")

        formatted_output = run_pipeline(dicom_path)

    questionnaire_context = ""
    if questionnaire_data:
        questionnaire_context = f"""

=== PATIENT QUESTIONNAIRE DATA ===
PERSONAL INFORMATION:
• Name: {questionnaire_data.get('personalInformation', {}).get('firstName', 'Not provided')} {questionnaire_data.get('personalInformation', {}).get('lastName', '')}
• Date of Birth: {questionnaire_data.get('personalInformation', {}).get('dateOfBirth', 'Not provided')}
• Gender: {questionnaire_data.get('personalInformation', {}).get('gender', 'Not provided')}
• Weight: {questionnaire_data.get('personalInformation', {}).get('weight', 'Not provided')}
• Height: {questionnaire_data.get('personalInformation', {}).get('height', 'Not provided')}

MEDICAL HISTORY:
• Current Medications: {', '.join(questionnaire_data.get('medicalHistory', {}).get('currentMedications', [])) or 'None'}
• Known Allergies: {', '.join(questionnaire_data.get('medicalHistory', {}).get('knownAllergies', [])) or 'None'}
• Family History: {questionnaire_data.get('medicalHistory', {}).get('familyHistory', {}).get('hasChronicDiseases', 'Not provided')}
{f"• Family Conditions: {', '.join(questionnaire_data.get('medicalHistory', {}).get('familyHistory', {}).get('conditions', []))}" if questionnaire_data.get('medicalHistory', {}).get('familyHistory', {}).get('conditions') else ""}

CURRENT SYMPTOMS:
• Reported Symptoms: {', '.join(questionnaire_data.get('currentSymptoms', [])) or 'None reported'}

"""

    structured_prompt = f"""{formatted_output}{questionnaire_context}

=== CRITICAL ANALYSIS APPROACH ===
Your task is to SYNTHESIZE and COMBINE two critical sources of information:

1. HOPPR AI MEDICAL IMAGING ANALYSIS (above): This contains the technical findings from AI analysis of the radiology scan, including detected abnormalities, ruled-out conditions, confidence scores, and radiological observations.

2. PATIENT QUESTIONNAIRE DATA (above): This contains the patient's personal information, medical history (medications, allergies, family history), and current reported symptoms.

YOUR ANALYSIS MUST:
- Synthesize BOTH the AI scan findings AND the patient's clinical context
- Connect the scan findings to the patient's reported symptoms (e.g., "Given that you reported [symptom], the AI detection of [finding] is particularly relevant...")
- Consider how the patient's medications or medical history might relate to or explain the scan findings
- Adjust your recommendations based on the patient's overall health profile, not just the scan results alone
- Explain how the patient's personal context affects the interpretation and urgency of the findings
- Create a coherent narrative that weaves together: "What the scan shows" + "What this means given YOUR specific situation"

DO NOT simply summarize the scan findings separately from the patient context. Instead, INTEGRATE them into a unified, personalized explanation that shows how the imaging results relate to THIS specific patient's health situation.

=== CRITICAL OUTPUT FORMAT REQUIREMENTS ===
You MUST provide your response as a VALID JSON object FIRST, followed by optional additional text. The JSON must contain exactly these fields:

{{
  "explanation": "A patient-friendly explanation that COMBINES the AI scan findings with the patient's personal context. Write 2-4 clear, concise paragraphs (separated by \\n\\n) that: (1) explain what the scan found, (2) connect those findings to the patient's reported symptoms and medical history, (3) explain what this combination means for THIS specific patient. Use plain, non-technical language. Show how the scan findings relate to their symptoms and health situation. Start with the most important finding first.",
  "keyFindings": [
    "First key finding as a concise phrase (e.g., 'Large mass in right upper lung', 'Small pleural effusion detected')",
    "Second key finding as a concise phrase",
    "Third key finding as a concise phrase (only include actual medical findings, not explanations)"
  ],
  "nextSteps": [
    "First specific, actionable recommendation that considers BOTH the scan findings AND the patient's medical history/symptoms",
    "Second specific recommendation tailored to the patient's situation",
    "Third specific recommendation (if applicable) that integrates their clinical context"
  ],
  "severity": "normal",
  "summary": "A brief 1-2 sentence summary of the overall findings and their significance. This should be patient-friendly and accessible."
}}

REQUIREMENTS:
1. The severity must be exactly one of: "normal", "mild", "moderate", "severe", or "critical" - consider BOTH scan findings AND patient symptoms/history when determining severity
2. keyFindings should be concise phrases (3-8 words each), NOT full sentences or explanations
3. nextSteps should be actionable recommendations (full sentences starting with verbs like 'Schedule', 'Contact', 'Monitor', etc.) that are SPECIFICALLY tailored by combining the scan results with the patient's medical history, medications, and symptoms
4. explanation MUST SYNTHESIZE both sources: reference the scan findings WHILE connecting them to the patient's reported symptoms, medications, and medical history. Show HOW the patient's context affects what the findings mean for them personally
5. All text must be in plain, non-technical language appropriate for patients
6. The JSON object must be valid and complete - do not include any text before the opening curly brace
7. After the JSON object closes with }}, you may optionally include additional explanatory text
8. CRITICAL: Your explanation should show CONNECTIONS between scan findings and patient context (e.g., "The AI detected [X], and given that you've been experiencing [symptom Y], this finding helps explain..." or "While the scan shows [X], your current medications [Y] might be related to...")

Example structure (notice how it COMBINES scan findings with patient context):
{{
  "explanation": "The AI analysis of your chest X-ray detected a large mass in the upper part of your right lung. Given that you've been experiencing persistent cough and chest pain for the past few weeks, this finding helps explain your symptoms.\\n\\nBecause you mentioned a family history of lung conditions and your current medications include [medication], your doctor will want to investigate this further. The combination of the scan findings and your symptoms suggests this needs prompt attention.\\n\\nThe good news is that modern imaging and treatment options are available, and catching this early gives you more treatment options.",
  "keyFindings": ["Large mass in right upper lung", "Small pleural effusion", "Right lung volume loss"],
  "nextSteps": ["Given your symptoms and the scan findings, schedule an appointment with your doctor within 48 hours to discuss treatment options", "Since you're taking [medication], bring a complete medication list to help your doctor understand your full health picture", "Monitor for any worsening of your reported cough and chest pain, as this could indicate changes that need immediate attention"],
  "severity": "severe",
  "summary": "The scan shows a significant finding in your right lung that, combined with your reported symptoms and medical history, requires prompt medical attention and follow-up."
}}

Now provide your analysis in the exact JSON format above:

"""

    client = OpenAI()
    response = client.responses.create(
        prompt={
            "id": PROMPT_ID,
            "version": "1",
        },
        input=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": structured_prompt,
                    }
                ],
            }
        ],
        text={
            "format": {
                "type": "text"
            }
        },
        reasoning={},
        max_output_tokens=2048,
        store=True,
        include=["web_search_call.action.sources"],
    )

    text = _extract_response_text(response)

    print("\n=== GPT MODEL OUTPUT ===\n")
    print(text)
    
    return text


if __name__ == "__main__":
    if len(sys.argv) > 2:
        pipeline_output = sys.argv[1]
        dicom_path = sys.argv[2]
        main(pipeline_output=pipeline_output, dicom_path=dicom_path)
    elif len(sys.argv) > 1:
        dicom_path = sys.argv[1]
        main(dicom_path=dicom_path)
    else:
        main()
