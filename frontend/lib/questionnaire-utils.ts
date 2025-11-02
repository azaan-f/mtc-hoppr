

export interface QuestionnaireData {
  personalInformation: {
    firstName: string
    lastName: string
    dateOfBirth: string
    gender: string
    weight: string
    height: string
    ethnicity: string
  }
  medicalHistory: {
    currentMedications: string[]
    knownAllergies: string[]
    familyHistory: {
      hasChronicDiseases: string
      conditions: string[]
    }
  }
  currentSymptoms: string[]
}


export const getQuestionnaireData = (): QuestionnaireData | null => {
  if (typeof window === 'undefined') return null
  
  const storedData = localStorage.getItem('questionnaireData')
  return storedData ? JSON.parse(storedData) : null
}


export const getFormattedQuestionnaireData = (): string => {
  if (typeof window === 'undefined') return ""
  
  return localStorage.getItem('questionnaireFormatted') || ""
}


export const generateChatGPTContext = (data?: QuestionnaireData): string => {
  const questionnaireData = data || getQuestionnaireData()
  
  if (!questionnaireData) {
    return "No patient questionnaire data available."
  }

  const formattedString = `PATIENT QUESTIONNAIRE DATA:

PERSONAL INFORMATION:
• Name: ${questionnaireData.personalInformation.firstName} ${questionnaireData.personalInformation.lastName}
• Date of Birth: ${questionnaireData.personalInformation.dateOfBirth}
• Gender: ${questionnaireData.personalInformation.gender}
• Weight: ${questionnaireData.personalInformation.weight}
• Height: ${questionnaireData.personalInformation.height}
• Ethnicity: ${questionnaireData.personalInformation.ethnicity}

MEDICAL HISTORY:
• Current Medications: ${questionnaireData.medicalHistory.currentMedications.join(", ")}
• Known Allergies: ${questionnaireData.medicalHistory.knownAllergies.join(", ")}
• Family History of Chronic Diseases: ${questionnaireData.medicalHistory.familyHistory.hasChronicDiseases}
${questionnaireData.medicalHistory.familyHistory.conditions.length > 0 ? 
  `• Family Disease History: ${questionnaireData.medicalHistory.familyHistory.conditions.join(", ")}` : 
  ""}

CURRENT SYMPTOMS:
• Reported Symptoms: ${questionnaireData.currentSymptoms.join(", ")}

SUMMARY:
Patient is a ${questionnaireData.personalInformation.gender} presenting with ${questionnaireData.currentSymptoms.join(", ").toLowerCase()}. ${questionnaireData.medicalHistory.familyHistory.hasChronicDiseases === "yes" ? 
  `Family history includes ${questionnaireData.medicalHistory.familyHistory.conditions.join(", ").toLowerCase()}.` : 
  "No significant family history reported."} Currently taking ${questionnaireData.medicalHistory.currentMedications.join(", ").toLowerCase()}.`

  return formattedString
}


export const clearQuestionnaireData = (): void => {
  if (typeof window === 'undefined') return
  
  localStorage.removeItem('questionnaireData')
  localStorage.removeItem('questionnaireFormatted')
}


export const saveQuestionnaireData = (data: QuestionnaireData): void => {
  if (typeof window === 'undefined') return
  
  localStorage.setItem('questionnaireData', JSON.stringify(data))
  localStorage.setItem('questionnaireFormatted', generateChatGPTContext(data))
}