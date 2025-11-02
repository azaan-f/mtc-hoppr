import { type NextRequest, NextResponse } from "next/server"
import { readFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filepath = searchParams.get("path")

    if (!filepath) {
      return NextResponse.json({ error: "No file path provided" }, { status: 400 })
    }

    if (!existsSync(filepath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const fileExtension = filepath.toLowerCase().split('.').pop()
    let finalPath = filepath
    let contentType = 'application/octet-stream'

    if (fileExtension === 'dcm') {
      const cacheDir = join(process.cwd(), '..', 'temp', 'image_cache')
      await mkdir(cacheDir, { recursive: true })
      
      const cachePath = join(cacheDir, `${filepath.replace(/[^a-zA-Z0-9]/g, '_')}.png`)
      
      if (existsSync(cachePath)) {
        finalPath = cachePath
        contentType = 'image/png'
      } else {
        try {
          const converterScript = join(process.cwd(), '..', 'dicom_to_image.py')
          const convertCommand = `python "${converterScript}" "${filepath}" --output "${cachePath}"`
          
          await execAsync(convertCommand, {
            cwd: join(process.cwd(), '..'),
            encoding: 'utf8',
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
          })
          
          if (existsSync(cachePath)) {
            finalPath = cachePath
            contentType = 'image/png'
          } else {
            throw new Error('DICOM conversion failed')
          }
        } catch (convertError) {
          console.error('DICOM conversion error:', convertError)
          return NextResponse.json({ 
            error: "Failed to convert DICOM to image",
            details: convertError instanceof Error ? convertError.message : String(convertError)
          }, { status: 500 })
        }
      }
    } else if (fileExtension === 'png') {
      contentType = 'image/png'
    } else if (fileExtension === 'jpg' || fileExtension === 'jpeg') {
      contentType = 'image/jpeg'
    }

    const fileBuffer = await readFile(finalPath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error("Image serving error:", error)
    return NextResponse.json({ error: "Failed to serve image" }, { status: 500 })
  }
}
