import { type NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const analysisId = searchParams.get('analysisId')

    if (!analysisId) {
      return NextResponse.json({ error: "No analysis ID provided" }, { status: 400 })
    }

    const statusFile = join(process.cwd(), '..', 'temp', `${analysisId}_status.json`)
    
    if (!existsSync(statusFile)) {
      return NextResponse.json({ 
        status: 'not_found',
        progress: 0,
        message: 'Analysis not found'
      })
    }

    const statusData = await readFile(statusFile, 'utf-8')
    const status = JSON.parse(statusData)

    return NextResponse.json(status)

  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json({ 
      error: "Failed to check status",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}