import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filepath, questionnaireData, pipelineOutput } = body

    if (pipelineOutput) {
      console.log(`Running GPT analysis with provided pipeline output`)
      
      const gptResponse = await fetch('http://localhost:8000/analyze/gpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pipeline_output: pipelineOutput,
          filepath: filepath || '',
          questionnaire_data: questionnaireData || null
        })
      }).catch((fetchError) => {
        throw new Error(`Connection failed: ${fetchError.message}`)
      })

      if (!gptResponse.ok) {
        const errorData = await gptResponse.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`GPT analysis error: ${errorData.error || 'Unknown error'}`)
      }

      const gptData = await gptResponse.json()

      if (!gptData.success) {
        throw new Error(`GPT analysis failed: ${gptData.error || 'Unknown error'}`)
      }

      const analysisResults = {
        pipelineAnalysis: pipelineOutput,
        gptAnalysis: gptData.interpretation,
        questionnaireData: questionnaireData || null,
        filepath: filepath,
        timestamp: new Date().toISOString(),
        success: true
      }

      return NextResponse.json(analysisResults)
    } else {
      if (!filepath) {
        return NextResponse.json({ error: "No file path provided" }, { status: 400 })
      }

      if (!existsSync(filepath)) {
        return NextResponse.json({ error: "File not found" }, { status: 404 })
      }

      let questionnaireFile = null
      if (questionnaireData) {
        const tempDir = join(process.cwd(), '..', 'temp')
        await mkdir(tempDir, { recursive: true })
        
        questionnaireFile = join(tempDir, `questionnaire_${Date.now()}.json`)
        await writeFile(questionnaireFile, JSON.stringify(questionnaireData, null, 2))
      }

      console.log(`Running complete analysis via medical API on: ${filepath}`)
      
      const analysisResponse = await fetch('http://localhost:8000/analyze/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filepath: filepath,
          questionnaire_data: questionnaireData
        })
      }).catch((fetchError) => {
        throw new Error(`Connection failed: ${fetchError.message}`)
      })

      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`Medical API error: ${errorData.error || 'Unknown error'}`)
      }

      const analysisData = await analysisResponse.json()

      if (!analysisData.success) {
        throw new Error(`Analysis failed: ${analysisData.error || 'Unknown error'}`)
      }

      const analysisResults = {
        pipelineAnalysis: analysisData.pipeline_analysis,
        gptAnalysis: analysisData.gpt_analysis,
        questionnaireData: questionnaireData || null,
        filepath: filepath,
        timestamp: new Date().toISOString(),
        success: true
      }

      return NextResponse.json(analysisResults)
    }

  } catch (error) {
    console.error("Analysis error:", error)
    
    let errorMessage = "Analysis failed"
    let errorDetails = error instanceof Error ? error.message : String(error)
    
    if (errorDetails.includes("ECONNREFUSED") || errorDetails.includes("fetch failed")) {
      errorMessage = "Backend server not running"
      errorDetails = "The Flask API server at http://localhost:8000 is not running. Please start it with: python medical_api.py"
    }
    
    return NextResponse.json({ 
      error: errorMessage, 
      details: errorDetails
    }, { status: 500 })
  }
}