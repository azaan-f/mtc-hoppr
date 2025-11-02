import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { exec } from "child_process"
import { promisify } from "util"
import { existsSync } from "fs"

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadsDir = join(process.cwd(), '..', 'uploads')
    await mkdir(uploadsDir, { recursive: true })
    
    const timestamp = Date.now()
    const filename = `${timestamp}_${file.name}`
    const filepath = join(uploadsDir, filename)

    await writeFile(filepath, buffer)

    let dicomPath = filepath
    let imagePreviewPath = filepath
    const fileExtension = file.name.toLowerCase().split('.').pop()
    const isImageFile = ['png', 'jpg', 'jpeg'].includes(fileExtension || '')

    if (isImageFile) {
      console.log(`Converting image file ${filepath} to DICOM format...`)
      try {
        const converterScript = join(process.cwd(), '..', 'image_to_dicom.py')
        const outputDicomPath = filepath.replace(/\.(png|jpg|jpeg)$/i, '.dcm')
        
        const convertCommand = `python "${converterScript}" "${filepath}" --output "${outputDicomPath}"`
        const { stdout: convertOutput, stderr: convertError } = await execAsync(convertCommand, {
          cwd: join(process.cwd(), '..'),
          encoding: 'utf8',
          env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        })
        
        if (existsSync(outputDicomPath)) {
          dicomPath = outputDicomPath
          console.log(`Successfully converted to DICOM: ${dicomPath}`)
        } else {
          throw new Error(`Conversion failed: DICOM file not created`)
        }
      } catch (convertError) {
        console.error('Image conversion error:', convertError)
        return NextResponse.json({ 
          error: "Failed to convert image to DICOM format",
          details: convertError instanceof Error ? convertError.message : String(convertError)
        }, { status: 500 })
      }
    }

    const analysisId = `analysis_${timestamp}`
    startPipelineAnalysis(dicomPath, analysisId)

    return NextResponse.json({
      message: "File uploaded successfully",
      filename: filename,
      filepath: dicomPath,
      originalImagePath: imagePreviewPath,
      originalName: file.name,
      size: file.size,
      type: file.type,
      analysisId: analysisId,
      wasConverted: isImageFile,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

async function startPipelineAnalysis(filepath: string, analysisId: string) {
  try {
    console.log(`Starting pipeline analysis for: ${filepath}`)
    
    const statusDir = join(process.cwd(), '..', 'temp')
    await mkdir(statusDir, { recursive: true })
    const statusFile = join(statusDir, `${analysisId}_status.json`)
    
    await writeFile(statusFile, JSON.stringify({
      status: 'running',
      progress: 0,
      startTime: new Date().toISOString(),
      message: 'Starting pipeline analysis...'
    }))

    const pipelineCommand = `python "${join(process.cwd(), '..', 'pipeline.py')}" "${filepath}"`
    const { stdout: pipelineOutputRaw, stderr: pipelineError } = await execAsync(pipelineCommand, {
      cwd: join(process.cwd(), '..'),
      encoding: 'utf8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    })

    let pipelineOutput = pipelineOutputRaw
    const marker = "FORMATTED OUTPUT FOR GPT:"
    const markerIndex = pipelineOutput.indexOf(marker)
    if (markerIndex !== -1) {
      pipelineOutput = pipelineOutput.substring(markerIndex + marker.length).trim()
      pipelineOutput = pipelineOutput.replace(/^=+\s*/m, '').trim()
    } else {
      const lines = pipelineOutput.split('\n')
      const reportStartIndex = lines.findIndex(line => 
        line.includes('CHEST X-RAY ANALYSIS') || 
        line.includes('FINDINGS EXPLANATION') ||
        line.includes('POSITIVE FINDINGS')
      )
      if (reportStartIndex !== -1) {
        pipelineOutput = lines.slice(reportStartIndex).join('\n').trim()
      } else {
        pipelineOutput = lines.slice(-100).join('\n').trim()
      }
    }

    await writeFile(statusFile, JSON.stringify({
      status: 'completed',
      progress: 100,
      endTime: new Date().toISOString(),
      pipelineOutput: pipelineOutput,
      pipelineError: pipelineError,
      message: 'Pipeline analysis completed'
    }))

    console.log(`Pipeline analysis completed for: ${filepath}`)
  } catch (error) {
    console.error('Pipeline analysis failed:', error)
    
    const statusDir = join(process.cwd(), '..', 'temp')
    const statusFile = join(statusDir, `${analysisId}_status.json`)
    try {
      await writeFile(statusFile, JSON.stringify({
        status: 'error',
        progress: 0,
        endTime: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        message: 'Pipeline analysis failed'
      }))
    } catch (writeError) {
      console.error('Failed to write error status:', writeError)
    }
  }
}
