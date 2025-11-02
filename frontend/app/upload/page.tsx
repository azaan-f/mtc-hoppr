"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Upload, X, FileImage, ArrowRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function UploadPage() {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedFile) return

    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (!uploadResponse.ok) {
        throw new Error('Upload failed')
      }
      
      const uploadData = await uploadResponse.json()
      console.log('File uploaded and pipeline started:', uploadData)
      
      localStorage.removeItem('analysisResults')
      
      setUploadedFilePath(uploadData.filepath)
      localStorage.setItem('uploadedFilePath', uploadData.filepath)
      localStorage.setItem('uploadedFileName', uploadData.originalName)
      localStorage.setItem('analysisId', uploadData.analysisId)
      if (uploadData.originalImagePath) {
        localStorage.setItem('originalImagePath', uploadData.originalImagePath)
      }
      
      router.push("/intake")
      
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Upload your X-ray, CT scan, or MRI for instant AI analysis
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="bg-card border-border/50 shadow-md rounded-3xl overflow-hidden">
              <CardContent className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">
                    Radiology Image <span className="text-red-500">*</span>
                  </Label>
                  {!selectedFile ? (
                    <label
                      htmlFor="file-upload"
                      className="flex flex-col items-center justify-center w-full h-72 border-2 border-dashed border-border rounded-3xl cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                          <Upload className="w-8 h-8 text-primary" />
                        </div>
                        <p className="mb-2 text-lg font-medium text-foreground">Click to upload or drag and drop</p>
                        <p className="text-sm text-muted-foreground">PNG, JPG, DICOM (MAX. 10MB)</p>
                      </div>
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        accept="image/*,.dcm"
                        onChange={handleFileChange}
                        required
                      />
                    </label>
                  ) : (
                    <div className="relative w-full h-72 border-2 border-border rounded-3xl overflow-hidden bg-muted/30">
                      {previewUrl && (
                        <Image src={previewUrl || "/placeholder.svg"} alt="Preview" fill className="object-contain" />
                      )}
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="absolute top-4 right-4 p-2 bg-card/90 backdrop-blur-sm rounded-2xl hover:bg-card transition-colors shadow-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-card/90 backdrop-blur-sm p-4 flex items-center gap-3">
                        <FileImage className="w-6 h-6 text-primary" />
                        <span className="text-sm font-medium truncate">{selectedFile.name}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4 pt-4">
              <Link href="/">
                <Button type="button" variant="outline" className="rounded-full px-6 bg-transparent">
                  Back
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isUploading || !selectedFile}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full px-8"
              >
                {isUploading ? "Processing..." : "Continue to Questionnaire"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
