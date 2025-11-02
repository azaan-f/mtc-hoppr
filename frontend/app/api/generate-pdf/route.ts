import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const {
      name = "N/A",
      dob = "",
      gender = "N/A", 
      patientid = "AUTO-GENERATED",
      physician = "N/A",
      examdate = new Date().toISOString().split('T')[0],
      examtype = "Chest X-Ray",
      history = "AI-assisted medical imaging analysis",
      technique = "Digital radiography with AI analysis using clario medical imaging platform",
      findings = "",
      impression = "",
      recommendations = "",
      radiologist = "AI Assistant (clario)",
      specialty = "Artificial Intelligence",
      license = "AI-SYSTEM-001",
      reportdate = new Date().toISOString().split('T')[0],
      signature = "Digitally signed by AI system",
      pipelineAnalysis = "",
      gptAnalysis = ""
    } = data

    const templatePath = join(process.cwd(), 'templates', 'radiology-report.html')
    let htmlTemplate = await readFile(templatePath, 'utf-8')

    let extractedFindings = findings
    let extractedImpression = impression
    let extractedRecommendations = recommendations

    if (!extractedFindings && pipelineAnalysis) {
      extractedFindings = pipelineAnalysis
    }

    if (!extractedImpression && gptAnalysis) {
      extractedImpression = gptAnalysis
    }

    if (!extractedRecommendations) {
      extractedRecommendations = "Follow up with your healthcare provider to discuss these results and determine next steps based on your clinical condition."
    }

    const templateVars = {
      name,
      dob,
      gender,
      patientid,
      physician,
      examdate,
      examtype,
      history,
      technique,
      findings: extractedFindings,
      impression: extractedImpression,
      recommendations: extractedRecommendations,
      radiologist,
      specialty,
      license,
      reportdate,
      signature
    }

    Object.entries(templateVars).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`
      htmlTemplate = htmlTemplate.replace(new RegExp(placeholder, 'g'), value || 'N/A')
    })

    return new NextResponse(htmlTemplate, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': 'inline; filename="radiology-report.html"'
      }
    })

  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json({ 
      error: "PDF generation failed", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}