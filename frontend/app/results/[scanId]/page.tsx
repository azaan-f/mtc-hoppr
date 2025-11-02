"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ArrowRight, ArrowLeft } from "lucide-react"
import { TagInput } from "@/components/tag-input"

const MEDICATION_SUGGESTIONS = [
  "Aspirin",
  "Ibuprofen",
  "Acetaminophen",
  "Lisinopril",
  "Metformin",
  "Atorvastatin",
  "Omeprazole",
  "Levothyroxine",
  "Amlodipine",
  "Metoprolol",
]

const ALLERGY_SUGGESTIONS = [
  "Penicillin",
  "Peanuts",
  "Tree Nuts",
  "Shellfish",
  "Eggs",
  "Milk",
  "Soy",
  "Wheat",
  "Latex",
  "Pollen",
  "Dust Mites",
  "Pet Dander",
  "Bee Stings",
]

const SYMPTOM_SUGGESTIONS = [
  "Headache",
  "Fever",
  "Cough",
  "Shortness of Breath",
  "Chest Pain",
  "Abdominal Pain",
  "Nausea",
  "Fatigue",
  "Dizziness",
  "Joint Pain",
  "Back Pain",
  "Muscle Aches",
]

export default function IntakePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [gender, setGender] = useState("")
  const [weight, setWeight] = useState("")
  const [height, setHeight] = useState("")
  const [ethnicity, setEthnicity] = useState("")

  const [medications, setMedications] = useState<string[]>([])
  const [allergies, setAllergies] = useState<string[]>([])
  const [hasFamilyHistory, setHasFamilyHistory] = useState("")
  const [familyDiseases, setFamilyDiseases] = useState<string[]>([])
  const [otherDisease, setOtherDisease] = useState("")

  const [symptoms, setSymptoms] = useState<string[]>([])

  const totalSteps = 3

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
      setProgress((currentStep / totalSteps) * 100)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setProgress(((currentStep - 2) / totalSteps) * 100)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

  }

  const formatQuestionnaireData = () => {
    const questionnaireData = {
      personalInformation: {
        firstName,
        lastName,
        dateOfBirth,
        gender,
        weight: weight ? `${weight} lbs` : "",
        height: height ? `${height} inches` : "",
        ethnicity
      },
      medicalHistory: {
        currentMedications: medications.length > 0 ? medications : ["None reported"],
        knownAllergies: allergies.length > 0 ? allergies : ["None reported"],
        familyHistory: {
          hasChronicDiseases: hasFamilyHistory,
          conditions: hasFamilyHistory === "yes" ? 
            [...familyDiseases, ...(otherDisease ? [otherDisease] : [])] : 
            []
        }
      },
      currentSymptoms: symptoms.length > 0 ? symptoms : ["None reported"]
    }

    return questionnaireData
  }

  const formatForChatGPT = () => {
    const data = formatQuestionnaireData()
    
    const formattedString = `PATIENT QUESTIONNAIRE DATA:

PERSONAL INFORMATION:
• Name: ${data.personalInformation.firstName} ${data.personalInformation.lastName}
• Date of Birth: ${data.personalInformation.dateOfBirth}
• Gender: ${data.personalInformation.gender}
• Weight: ${data.personalInformation.weight}
• Height: ${data.personalInformation.height}
• Ethnicity: ${data.personalInformation.ethnicity}

MEDICAL HISTORY:
• Current Medications: ${data.medicalHistory.currentMedications.join(", ")}
• Known Allergies: ${data.medicalHistory.knownAllergies.join(", ")}
• Family History of Chronic Diseases: ${data.medicalHistory.familyHistory.hasChronicDiseases}
${data.medicalHistory.familyHistory.conditions.length > 0 ? 
  `• Family Disease History: ${data.medicalHistory.familyHistory.conditions.join(", ")}` : 
  ""}

CURRENT SYMPTOMS:
• Reported Symptoms: ${data.currentSymptoms.join(", ")}

SUMMARY:
Patient is a ${data.personalInformation.gender} presenting with ${data.currentSymptoms.join(", ").toLowerCase()}. ${data.medicalHistory.familyHistory.hasChronicDiseases === "yes" ? 
  `Family history includes ${data.medicalHistory.familyHistory.conditions.join(", ").toLowerCase()}.` : 
  "No significant family history reported."} Currently taking ${data.medicalHistory.currentMedications.join(", ").toLowerCase()}.`

    return formattedString
  }

  const handleExplicitSubmit = async () => {
    if (currentStep === totalSteps) {
      setIsSubmitting(true)
      
      try {

        const structuredData = formatQuestionnaireData()
        const chatGPTFormat = formatForChatGPT()

        localStorage.setItem('questionnaireData', JSON.stringify(structuredData))
        localStorage.setItem('questionnaireFormatted', chatGPTFormat)

        const analysisId = localStorage.getItem('analysisId')
        const uploadedFilePath = localStorage.getItem('uploadedFilePath')
        
        if (analysisId && uploadedFilePath) {
          console.log("Checking pipeline status for analysis:", analysisId)

          router.push("/results")
          
        } else {
          console.warn('No analysis ID or uploaded file found')

          router.push("/results")
        }
        
      } catch (error) {
        console.error('Submission error:', error)
        alert('Submission failed. Please try again.')
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit}>
            {currentStep === 1 && (
              <Card className="bg-card border-border/50 shadow-md rounded-3xl overflow-hidden">
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center text-lg font-bold flex-shrink-0">
                      01
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Personal Information</h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-foreground font-medium">
                        First Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        required
                        className="rounded-2xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-foreground font-medium">
                        Last Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                        required
                        className="rounded-2xl"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth" className="text-foreground font-medium">
                        Date of Birth <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        required
                        className="rounded-2xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender" className="text-foreground font-medium">
                        Gender <span className="text-red-500">*</span>
                      </Label>
                      <Select value={gender} onValueChange={setGender} required>
                        <SelectTrigger className="rounded-2xl">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="weight" className="text-foreground font-medium">
                        Weight (lbs) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="weight"
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="150"
                        required
                        className="rounded-2xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height" className="text-foreground font-medium">
                        Height (inches) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="height"
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="68"
                        required
                        className="rounded-2xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ethnicity" className="text-foreground font-medium">
                      Ethnicity <span className="text-red-500">*</span>
                    </Label>
                    <Select value={ethnicity} onValueChange={setEthnicity} required>
                      <SelectTrigger className="rounded-2xl">
                        <SelectValue placeholder="Select ethnicity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="american-indian">American Indian or Alaska Native</SelectItem>
                        <SelectItem value="asian">Asian</SelectItem>
                        <SelectItem value="black">Black or African American</SelectItem>
                        <SelectItem value="hispanic">Hispanic or Latino</SelectItem>
                        <SelectItem value="pacific-islander">Native Hawaiian or Other Pacific Islander</SelectItem>
                        <SelectItem value="white">White</SelectItem>
                        <SelectItem value="two-or-more">Two or More Races</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 2 && (
              <Card className="bg-card border-border/50 shadow-md rounded-3xl overflow-hidden">
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center text-lg font-bold flex-shrink-0">
                      02
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Medical History</h3>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground font-medium">
                      Current Medications <span className="text-red-500">*</span>
                    </Label>
                    <TagInput
                      value={medications}
                      onChange={setMedications}
                      placeholder="Type medication name and press Enter..."
                      suggestions={MEDICATION_SUGGESTIONS}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground font-medium">
                      Known Allergies <span className="text-red-500">*</span>
                    </Label>
                    <TagInput
                      value={allergies}
                      onChange={setAllergies}
                      placeholder="Type allergy and press Enter..."
                      suggestions={ALLERGY_SUGGESTIONS}
                    />
                  </div>

                  <div className="space-y-4">
                    <Label className="text-foreground font-medium">
                      Do you have a family history of chronic diseases such as cancer, diabetes, heart disease?{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <RadioGroup value={hasFamilyHistory} onValueChange={setHasFamilyHistory}>
                      <div className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="family-yes" />
                          <Label htmlFor="family-yes" className="cursor-pointer font-normal">
                            Yes
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="family-no" />
                          <Label htmlFor="family-no" className="cursor-pointer font-normal">
                            No
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>

                    {hasFamilyHistory === "yes" && (
                      <div className="space-y-2 pt-2">
                        <Label className="text-foreground font-medium">Select conditions (check all that apply)</Label>
                        <div className="grid md:grid-cols-2 gap-3">
                          {[
                            "Diabetes",
                            "Heart Disease",
                            "Hypertension",
                            "Cancer",
                            "Asthma",
                            "Obesity",
                            "Thyroid Disease",
                            "Alzheimer's Disease",
                          ].map((disease) => (
                            <label key={disease} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={familyDiseases.includes(disease)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFamilyDiseases([...familyDiseases, disease])
                                  } else {
                                    setFamilyDiseases(familyDiseases.filter((d) => d !== disease))
                                  }
                                }}
                                className="rounded border-border"
                              />
                              <span className="text-sm">{disease}</span>
                            </label>
                          ))}
                        </div>
                        <div className="space-y-2 pt-2">
                          <Label htmlFor="otherDisease" className="text-foreground font-medium text-sm">
                            Other (Please specify)
                          </Label>
                          <Input
                            id="otherDisease"
                            value={otherDisease}
                            onChange={(e) => setOtherDisease(e.target.value)}
                            placeholder="Specify other condition..."
                            className="rounded-2xl"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 3 && (
              <Card className="bg-card border-border/50 shadow-md rounded-3xl overflow-hidden">
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center text-lg font-bold flex-shrink-0">
                      03
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Current Symptoms</h3>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground font-medium">
                      What symptoms are you experiencing? <span className="text-red-500">*</span>
                    </Label>
                    <TagInput
                      value={symptoms}
                      onChange={setSymptoms}
                      placeholder="Type symptom and press Enter..."
                      suggestions={SYMPTOM_SUGGESTIONS}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="mt-8 space-y-6">
              <div className="space-y-2">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="flex justify-between gap-4">
                <Button
                  type="button"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  variant="outline"
                  className="rounded-full px-6 bg-transparent"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8"
                  >
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleExplicitSubmit}
                    disabled={isSubmitting}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8"
                  >
                    {isSubmitting ? "Submitting..." : "Submit & View Results"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
