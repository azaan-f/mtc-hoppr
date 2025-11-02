"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { AlertCircle, CheckCircle, Info, Download, User, Image as ImageIcon } from "lucide-react"
import Image from "next/image"
import ConfidenceGauge from "@/components/confidence-gauge"
import { useState, useEffect, useMemo } from "react"
import { parsePipelineOutput, parseGPTOutput, determineSeverityFromPipeline } from "@/lib/analysis-parser"
import { generatePDF } from "@/lib/pdf-generator"

const mockResult = {
  finding_summary: "No significant abnormalities detected",
  detailed_explanation:
    "The AI analysis of your radiology scan shows clear imaging with no signs of acute abnormalities. The structures appear normal, and there are no concerning findings that require immediate attention. This is a reassuring result that suggests no urgent issues.",
  confidence_score: 92.5,
  severity: "normal",
  recommended_actions:
    "Continue with your current health routine. If you develop new symptoms or have concerns, please consult your healthcare provider for a comprehensive evaluation.",
}

export default function ResultsPage() {
  const [questionnaireData, setQuestionnaireData] = useState<any>(null)
  const [analysisResults, setAnalysisResults] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pipelineStatus, setPipelineStatus] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)

  const checkPipelineStatus = async (analysisId: string) => {
    try {
      const response = await fetch(`/api/status?analysisId=${analysisId}`)
      const status = await response.json()
      setPipelineStatus(status)
      
      if (status.status === 'running') {

        if (!startTime) {
          setStartTime(Date.now())
        }

        const elapsed = Date.now() - (startTime || Date.now())
        if (elapsed > 300000) {
          console.warn('Pipeline timeout - proceeding with GPT analysis')
          await runGPTAnalysis("Pipeline analysis timed out")
          return
        }

        const startTimeValue = new Date(status.startTime).getTime()
        const currentTime = new Date().getTime()
        const elapsedFromStart = currentTime - startTimeValue
        const estimatedTotal = 120000
        const calculatedProgress = Math.min((elapsedFromStart / estimatedTotal) * 100, 95)
        setProgress(calculatedProgress)

        setTimeout(() => checkPipelineStatus(analysisId), 2000)
      } else if (status.status === 'completed') {

        setProgress(90)
        setPipelineStatus({ ...status, message: 'Pipeline complete. Generating personalized report...' })

        await runGPTAnalysis(status.pipelineOutput)
      } else if (status.status === 'error') {

        setProgress(90)
        setPipelineStatus({ ...status, message: 'Pipeline completed with errors. Generating report...' })
        console.error('Pipeline failed:', status.error)

        await runGPTAnalysis(status.pipelineOutput || "Pipeline analysis failed")
      }
    } catch (error) {
      console.error('Status check failed:', error)
      setIsProcessing(false)
      setIsLoading(false)
    }
  }

  const runGPTAnalysis = async (pipelineOutput: string) => {
    let analysisResponse: Response | null = null
    
    try {
      const uploadedFilePath = localStorage.getItem('uploadedFilePath')
      const questionnaireData = localStorage.getItem('questionnaireData')

      setPipelineStatus({
        status: 'processing_gpt',
        message: 'Generating personalized explanation...',
        progress: 95
      })
      setProgress(95)
      
      console.log("Running GPT analysis with pipeline results and questionnaire data")
      
      analysisResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filepath: uploadedFilePath,
          questionnaireData: questionnaireData ? JSON.parse(questionnaireData) : null,
          pipelineOutput: pipelineOutput
        }),
      })
      
      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json().catch(() => ({}))
        const errorMsg = errorData.details || errorData.error || 'GPT analysis failed'
        throw new Error(errorMsg)
      }
      
      const analysisResults = await analysisResponse.json()

      setAnalysisResults(analysisResults)
      localStorage.setItem('analysisResults', JSON.stringify(analysisResults))

      setProgress(100)
      setPipelineStatus({
        status: 'completed',
        message: 'Analysis complete!',
        progress: 100
      })

      await new Promise(resolve => setTimeout(resolve, 500))

      setIsProcessing(false)
      setIsLoading(false)
      
    } catch (error) {
      console.error('GPT analysis failed:', error)
      
      let errorMessage = 'Failed to generate personalized report.'
      const errorDetails = error instanceof Error ? error.message : String(error)
      
      if (errorDetails.includes('Backend server not running') || errorDetails.includes('Connection failed') || errorDetails.includes('ECONNREFUSED') || errorDetails.includes('fetch failed')) {
        errorMessage = 'Backend server is not running. Please start the Flask API server with: python medical_api.py'
      } else if (analysisResponse && !analysisResponse.ok) {
        try {
          const errorData = await analysisResponse.json()
          errorMessage = errorData.details || errorData.error || errorMessage
        } catch {
          errorMessage = errorDetails
        }
      }
      
      setPipelineStatus({
        status: 'error',
        message: errorMessage,
        error: errorDetails
      })
      setIsProcessing(false)
      setIsLoading(false)
    }
  }

  useEffect(() => {

    const storedData = localStorage.getItem('questionnaireData')
    const storedAnalysis = localStorage.getItem('analysisResults')
    const analysisId = localStorage.getItem('analysisId')
    const currentFilePath = localStorage.getItem('uploadedFilePath')
    const storedFilePath = storedAnalysis ? JSON.parse(storedAnalysis)?.filepath : null
    
    if (storedData) {
      setQuestionnaireData(JSON.parse(storedData))
    }

    if (storedAnalysis && currentFilePath) {
      const parsed = JSON.parse(storedAnalysis)

      if (parsed.filepath === currentFilePath || parsed.filepath === storedFilePath) {

        setAnalysisResults(parsed)
        setIsLoading(false)
        return
      } else {

        console.log('File changed, clearing cached analysis results')
        localStorage.removeItem('analysisResults')

        if (analysisId) {
          localStorage.removeItem('analysisId')
        }
      }
    }

    if (analysisId && currentFilePath) {

      setIsProcessing(true)
      checkPipelineStatus(analysisId)
    } else if (storedAnalysis && !currentFilePath) {

      setAnalysisResults(JSON.parse(storedAnalysis))
      setIsLoading(false)
    } else {

      setIsLoading(false)
    }
  }, [])

  const parsedPipeline = useMemo(() => {
    if (analysisResults?.pipelineAnalysis) {
      return parsePipelineOutput(analysisResults.pipelineAnalysis)
    }
    return null
  }, [analysisResults])

  const parsedGPT = useMemo(() => {
    if (analysisResults?.gptAnalysis) {
      return parseGPTOutput(analysisResults.gptAnalysis)
    }
    return null
  }, [analysisResults])

  const getDisplayResults = () => {
    if (analysisResults && analysisResults.success) {

      const severity = parsedPipeline 
        ? determineSeverityFromPipeline(parsedPipeline)
        : parsedGPT?.severity || "moderate"

      const significantFindings = parsedPipeline?.positiveFindings.filter(f => f.score > 0.5) || []

      let findingSummary = "No significant abnormalities detected"
      
      if (parsedGPT?.explanation) {

        const firstSentence = parsedGPT.explanation.split(/[.!?]+/)[0].trim()
        if (firstSentence.length > 20 && firstSentence.length < 120) {
          findingSummary = firstSentence
        } else if (significantFindings.length > 0) {

          const topFinding = significantFindings.sort((a, b) => b.score - a.score)[0]
          findingSummary = `${topFinding.name} detected in your scan`
        }
      } else if (significantFindings.length > 0) {

        const topFinding = significantFindings.sort((a, b) => b.score - a.score)[0]
        if (significantFindings.length === 1) {
          findingSummary = `${topFinding.name} detected`
        } else {
          findingSummary = `${significantFindings.length} abnormalities detected, including ${topFinding.name}`
        }
      }

      let confidenceScore = 85.0
      if (significantFindings.length > 0) {
        const avgScore = significantFindings.reduce((sum, f) => sum + f.score, 0) / significantFindings.length

        const clampedScore = Math.max(0, Math.min(1, avgScore))
        confidenceScore = Math.round(clampedScore * 100)
      } else if (parsedPipeline?.negativeFindings && parsedPipeline.negativeFindings.length > 0 && significantFindings.length === 0) {

        confidenceScore = 90.0
      }

      return {
        finding_summary: findingSummary,
        detailed_explanation: parsedGPT?.explanation || "Analysis completed successfully",
        gpt_analysis: parsedGPT || null,
        confidence_score: confidenceScore,
        severity: severity,
        recommended_actions: parsedGPT?.nextSteps?.join("\n") || "Please consult with your healthcare provider to discuss these results."
      }
    }

    return {
      finding_summary: "No analysis data available",
      detailed_explanation: "Please upload a scan and complete the questionnaire to see results.",
      confidence_score: 0,
      severity: "normal",
      recommended_actions: "Upload a new scan to get started."
    }
  }

  const currentResults = getDisplayResults()
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "normal":
        return "bg-green-600 text-white border-green-700"
      case "mild":
        return "bg-amber-500 text-white border-amber-600"
      case "moderate":
        return "bg-orange-600 text-white border-orange-700"
      case "severe":
        return "bg-pink-200 text-pink-700 border-pink-300"
      case "critical":
        return "bg-rose-200 text-rose-700 border-rose-300"
      default:
        return "bg-secondary text-foreground border-border"
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "normal":
        return <CheckCircle className="h-6 w-6 text-white" />
      case "mild":
        return <Info className="h-6 w-6 text-white" />
      case "moderate":
        return <AlertCircle className="h-6 w-6 text-white" />
      case "severe":
        return <AlertCircle className="h-6 w-6 text-pink-700" />
      case "critical":
        return <AlertCircle className="h-6 w-6 text-rose-700" />
      default:
        return <Info className="h-6 w-6 text-white" />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 backdrop-blur-xl sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/clario-logo.png"
              alt="clario logo"
              width={36}
              height={36}
              className="h-9 w-auto"
              priority
            />
            <span className="text-xl font-semibold text-foreground tracking-tight">clario</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {isProcessing && (
            <div className="text-center space-y-8">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-3 tracking-tight">
                  Analyzing Your Scan
                </h2>
                <p className="text-lg text-muted-foreground">
                  Please wait while our AI processes your radiology image...
                </p>
              </div>
              
              {pipelineStatus?.status === 'error' && pipelineStatus?.error?.includes('Backend server') ? (
                <Card className="bg-card border-red-500 max-w-2xl mx-auto">
                  <CardContent className="p-8 space-y-6">
                    <div className="flex items-center gap-4">
                      <AlertCircle className="h-8 w-8 text-red-500" />
                      <div className="text-left flex-1">
                        <h3 className="text-xl font-bold text-foreground mb-2">Backend Server Not Running</h3>
                        <p className="text-muted-foreground mb-4">
                          {pipelineStatus.message || 'The Flask API server is not running. Please start it to continue.'}
                        </p>
                        <div className="bg-muted p-4 rounded-lg">
                          <p className="text-sm font-mono text-foreground">
                            To start the server, run in a terminal:
                          </p>
                          <code className="text-sm font-mono text-primary mt-2 block">
                            python medical_api.py
                          </code>
                        </div>
                        <Button 
                          onClick={() => {
                            setIsProcessing(false)
                            setIsLoading(false)
                          }}
                          className="mt-4"
                          variant="outline"
                        >
                          Go Back
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-card border-border max-w-2xl mx-auto">
                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground">Analysis Progress</span>
                        <span className="text-muted-foreground">{Math.round(progress)}%</span>
                      </div>
                      
                      <div className="w-full bg-muted rounded-full h-3">
                        <div 
                          className="bg-primary h-3 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      
                      <div className="text-center text-sm text-muted-foreground">
                        {pipelineStatus?.message || 'Processing...'}
                      </div>
                    
                    <div className="space-y-3 pt-4">
                      <div className="flex items-center gap-3">
                        {progress > 20 ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-muted animate-spin"></div>
                        )}
                        <span className="text-sm">Loading medical imaging models...</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {progress > 50 ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : progress > 20 ? (
                          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-muted"></div>
                        )}
                        <span className="text-sm">Analyzing radiology image...</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {progress > 80 ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : progress > 50 ? (
                          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-muted"></div>
                        )}
                        <span className="text-sm">Generating medical findings...</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {progress >= 100 && !isProcessing ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : progress > 80 ? (
                          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-muted"></div>
                        )}
                        <span className="text-sm">
                          {progress >= 95 && isProcessing 
                            ? "Generating personalized explanation..." 
                            : "Preparing personalized report..."}
                        </span>
                      </div>
                    </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {pipelineStatus?.status !== 'error' && (
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  This usually takes 1-2 minutes. Thank you for your patience while we ensure the highest quality analysis.
                </p>
              )}
              
              {progress >= 100 && (
                <div className="mt-6">
                  <Button 
                    onClick={() => {
                      setIsProcessing(false)
                      setIsLoading(false)

                      if (!analysisResults) {
                        setAnalysisResults({
                          pipelineAnalysis: "Pipeline analysis completed successfully.",
                          gptAnalysis: "AI interpretation of the medical scan shows normal findings.",
                          success: true,
                          timestamp: new Date().toISOString()
                        })
                      }
                    }}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Proceed to Results
                  </Button>
                </div>
              )}
            </div>
          )}

          {!isProcessing && (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-3 tracking-tight">
                    Your Radiology Report
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    Analysis completed • {new Date().toLocaleDateString()}
                    {analysisResults && ` • File: ${localStorage.getItem('uploadedFileName') || 'Unknown'}`}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-border hover:bg-secondary bg-transparent"
                    onClick={async () => {
                      if (currentResults && parsedPipeline && parsedGPT) {
                        await generatePDF({
                          findingSummary: currentResults.finding_summary,
                          severity: currentResults.severity,
                          confidenceScore: currentResults.confidence_score,
                          explanation: parsedGPT.explanation || currentResults.detailed_explanation,
                          keyFindings: parsedGPT.keyFindings || [],
                          positiveFindings: parsedPipeline.positiveFindings.filter(f => f.score > 0.5).sort((a, b) => b.score - a.score),
                          negativeFindings: parsedPipeline.negativeFindings.slice(0, 10).map(f => ({ name: f.name })),
                          nextSteps: parsedGPT.nextSteps || (currentResults.recommended_actions ? currentResults.recommended_actions.split('\n').filter(s => s.trim()) : []),
                          patientInfo: {
                            examDate: new Date().toLocaleDateString(),
                          }
                        })
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>

          {(() => {
            const originalImagePath = localStorage.getItem('originalImagePath')
            const uploadedFilePath = localStorage.getItem('uploadedFilePath')
            const imagePath = originalImagePath || uploadedFilePath
            
            if (imagePath) {
              const imageUrl = `/api/image?path=${encodeURIComponent(imagePath)}`
              const isDicom = imagePath.toLowerCase().endsWith('.dcm')
              
              return (
                <Card className="bg-card border-border shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Your Scan Image
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative w-full h-96 bg-muted/30 rounded-lg overflow-hidden border border-border">
                      <Image
                        src={imageUrl}
                        alt="Medical scan image"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            }
            return null
          })()}

          <Card className={`border-2 shadow-md rounded-xl overflow-hidden ${getSeverityColor(currentResults.severity)}`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl ${currentResults.severity === 'severe' || currentResults.severity === 'critical' ? 'bg-white/40' : 'bg-white/20'} backdrop-blur-sm flex items-center justify-center flex-shrink-0`}>
                  {getSeverityIcon(currentResults.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-base md:text-lg font-semibold leading-tight ${currentResults.severity === 'severe' ? 'text-pink-700' : currentResults.severity === 'critical' ? 'text-rose-700' : 'text-white'}`}>
                    {currentResults.finding_summary}
                  </h3>
                </div>
                <Badge className={`${currentResults.severity === 'severe' || currentResults.severity === 'critical' ? 'bg-white/60 text-pink-700 border-white/50' : 'bg-white/20 text-white border-white/30'} backdrop-blur-sm font-semibold text-xs px-4 py-1.5 flex-shrink-0`}>
                  {currentResults.severity.toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-foreground">AI Confidence Level</CardTitle>
            </CardHeader>
            <CardContent>
              <ConfidenceGauge score={currentResults.confidence_score} />
            </CardContent>
          </Card>

          {parsedGPT && (parsedGPT.explanation || (parsedGPT.keyFindings && Array.isArray(parsedGPT.keyFindings) && parsedGPT.keyFindings.length > 0)) && (
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl md:text-3xl text-foreground font-bold">What This Means for You</CardTitle>
                <CardDescription className="text-muted-foreground text-base mt-2">
                  Plain-language explanation of your results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 pt-2">
                {parsedGPT.explanation && parsedGPT.explanation.trim() && (
                  <div className="space-y-4">
                    {parsedGPT.explanation.split(/\n\n+/).map((paragraph, idx) => {
                          const trimmed = paragraph.trim()
                      if (!trimmed ||
                          trimmed.toLowerCase().includes('/guide') ||
                          trimmed.toLowerCase().includes('narrative and summary support') ||
                          trimmed.toLowerCase().startsWith('guide') ||
                          trimmed.startsWith('**:') ||
                          trimmed.toLowerCase().includes('not explicitly given') ||
                          trimmed.toLowerCase().includes('mirrors the key findings')) {
                        return null
                      }
                      return (
                        <p key={idx} className="text-foreground leading-relaxed text-lg">
                          {trimmed}
                        </p>
                      )
                    }).filter(Boolean)}
                  </div>
                )}

                {parsedGPT.keyFindings && Array.isArray(parsedGPT.keyFindings) && parsedGPT.keyFindings.length > 0 && (
                  <div className="pt-4 border-t border-border">
                    <h4 className="text-xl font-semibold text-foreground mb-4">Key Findings</h4>
                    <ul className="space-y-3">
                      {parsedGPT.keyFindings
                        .filter(finding => {
                          if (!finding || typeof finding !== 'string') return false
                          const fLower = finding.toLowerCase()
                          return !fLower.includes('/guide') && 
                                 !fLower.includes('narrative and summary support') &&
                                 !fLower.includes('may be related') &&
                                 !fLower.includes('pressure/shift') &&
                                 !fLower.includes('secondary finding') &&
                                 finding.trim().length > 0
                        })
                        .map((finding, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="text-primary text-xl font-bold flex-shrink-0 w-4 text-left leading-6">•</span>
                            <span className="text-foreground text-base leading-relaxed flex-1 min-w-0">
                              {typeof finding === 'string' ? (finding.charAt(0).toUpperCase() + finding.slice(1)) : String(finding)}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {parsedGPT.summary && 
                 parsedGPT.summary.length > 50 &&
                 !parsedGPT.summary.toLowerCase().includes('/guide') &&
                 !parsedGPT.summary.toLowerCase().includes('narrative and summary support') &&
                 !parsedGPT.summary.toLowerCase().includes('not explicitly given') &&
                 !parsedGPT.summary.toLowerCase().includes('mirrors the key findings') &&
                 !parsedGPT.summary.startsWith('**:') && (
                  <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-6 border border-primary/20">
                    <p className="text-foreground leading-relaxed text-base">{parsedGPT.summary}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {parsedPipeline && (
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl md:text-3xl text-foreground font-bold">Key Findings</CardTitle>
                <CardDescription className="text-muted-foreground text-base mt-2">
                  What the AI detected in your scan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 pt-2">
                {parsedPipeline.positiveFindings.filter(f => f.score > 0.5).length > 0 && (
                  <div>
                    <h4 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                      <AlertCircle className="h-6 w-6 text-orange-500" />
                      Detected Abnormalities ({parsedPipeline.positiveFindings.filter(f => f.score > 0.5).length})
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      {parsedPipeline.positiveFindings
                        .filter(finding => finding.score > 0.5)
                        .sort((a, b) => b.score - a.score)
                        .map((finding, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl hover:bg-orange-500/15 transition-colors"
                          >
                            <span className="text-foreground font-medium text-base">{finding.name}</span>
                            <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30 font-semibold ml-3">
                              {(finding.score * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {parsedPipeline.negativeFindings.length > 0 && (
                  <div className="pt-4 border-t border-border">
                    <h4 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                      <CheckCircle className="h-6 w-6 text-green-500" />
                      Conditions Ruled Out ({parsedPipeline.negativeFindings.length})
                    </h4>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      The following conditions were not detected in your scan:{" "}
                      <span className="text-foreground font-medium">
                        {parsedPipeline.negativeFindings.slice(0, 8).map((f) => f.name).join(", ")}
                        {parsedPipeline.negativeFindings.length > 8 && " and more"}
                      </span>
                    </p>
                  </div>
                )}

                {parsedPipeline.vlmNarrative && (
                  <div className="pt-4 border-t border-border">
                    <h4 className="text-xl font-semibold text-foreground mb-4">Radiologist Narrative</h4>
                    <div className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-xl p-6 border border-border">
                      <p className="text-foreground leading-relaxed text-base">{parsedPipeline.vlmNarrative}</p>
                    </div>
                  </div>
                )}

                {parsedPipeline.summary.totalConditions > 0 && (
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-6 border-t border-border">
                    <span className="font-medium">Total analyzed: <span className="text-foreground">{parsedPipeline.summary.totalConditions}</span> conditions</span>
                    <span className="text-border">•</span>
                    <span className="font-medium">Abnormalities: <span className="text-orange-500">{parsedPipeline.summary.abnormalitiesDetected}</span></span>
                    <span className="text-border">•</span>
                    <span className="font-medium">Ruled out: <span className="text-green-500">{parsedPipeline.summary.conditionsRuledOut}</span></span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl md:text-3xl text-foreground font-bold">Recommended Next Steps</CardTitle>
              <CardDescription className="text-muted-foreground text-base mt-2">
                What you should do based on these results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              {parsedGPT && parsedGPT.nextSteps && parsedGPT.nextSteps.length > 0 ? (
                <ul className="space-y-3">
                  {parsedGPT.nextSteps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-sm font-semibold text-primary">{idx + 1}</span>
                      </div>
                      <p className="text-foreground leading-relaxed flex-1">{step}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-foreground leading-relaxed text-lg">{currentResults.recommended_actions}</p>
              )}
              
              {parsedPipeline && parsedPipeline.positiveFindings.filter(f => f.score > 0.5).length > 0 && (
                <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground mb-1">Important</p>
                      <p className="text-sm text-muted-foreground">
                        Abnormalities were detected in your scan. Please schedule a follow-up appointment with your healthcare provider as soon as possible to discuss these findings and determine the appropriate next steps.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {questionnaireData && (
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl md:text-3xl text-foreground font-bold flex items-center gap-2">
                  <User className="h-6 w-6" />
                  Patient Information
                </CardTitle>
                <CardDescription className="text-muted-foreground text-base mt-2">
                  Data collected from your questionnaire
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-foreground mb-4 text-lg">Personal Information</h4>
                    <div className="space-y-3 text-base">
                      <p><span className="text-muted-foreground">Name:</span> <span className="text-foreground font-medium">{questionnaireData.personalInformation?.firstName} {questionnaireData.personalInformation?.lastName}</span></p>
                      <p><span className="text-muted-foreground">Gender:</span> <span className="text-foreground font-medium">{questionnaireData.personalInformation?.gender}</span></p>
                      <p><span className="text-muted-foreground">Date of Birth:</span> <span className="text-foreground font-medium">{questionnaireData.personalInformation?.dateOfBirth}</span></p>
                      <p><span className="text-muted-foreground">Weight:</span> <span className="text-foreground font-medium">{questionnaireData.personalInformation?.weight}</span></p>
                      <p><span className="text-muted-foreground">Height:</span> <span className="text-foreground font-medium">{questionnaireData.personalInformation?.height}</span></p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-4 text-lg">Medical History</h4>
                    <div className="space-y-3 text-base">
                      <p><span className="text-muted-foreground">Medications:</span> <span className="text-foreground font-medium">{questionnaireData.medicalHistory?.currentMedications?.join(", ")}</span></p>
                      <p><span className="text-muted-foreground">Allergies:</span> <span className="text-foreground font-medium">{questionnaireData.medicalHistory?.knownAllergies?.join(", ")}</span></p>
                      <p><span className="text-muted-foreground">Family History:</span> <span className="text-foreground font-medium">{questionnaireData.medicalHistory?.familyHistory?.hasChronicDiseases}</span></p>
                      <p><span className="text-muted-foreground">Symptoms:</span> <span className="text-foreground font-medium">{questionnaireData.currentSymptoms?.join(", ")}</span></p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground leading-relaxed">
                  <p className="font-semibold text-foreground mb-2 text-base">Important Notice</p>
                  <p>
                    This AI-generated report is for informational purposes only and does not replace professional
                    medical advice, diagnosis, or treatment. Always consult with a qualified healthcare provider about
                    your medical condition and before making any healthcare decisions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/" className="flex-1">
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                Analyze Another Scan
              </Button>
            </Link>
          </div>
          </>
          )}
        </div>
      </main>
    </div>
  )
}
