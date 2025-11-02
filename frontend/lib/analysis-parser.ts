

export interface ParsedPipelineOutput {
  positiveFindings: Array<{ name: string; score: number }>
  negativeFindings: Array<{ name: string; score: number }>
  vlmNarrative: string
  summary: {
    totalConditions: number
    abnormalitiesDetected: number
    conditionsRuledOut: number
  }
  rawOutput: string
}

export interface ParsedGPTOutput {
  summary: string
  explanation: string
  nextSteps: string[]
  keyFindings: string[]
  severity?: "normal" | "mild" | "moderate" | "severe" | "critical"
  rawOutput: string
}


export function parsePipelineOutput(pipelineOutput: string): ParsedPipelineOutput {
  const result: ParsedPipelineOutput = {
    positiveFindings: [],
    negativeFindings: [],
    vlmNarrative: "",
    summary: {
      totalConditions: 0,
      abnormalitiesDetected: 0,
      conditionsRuledOut: 0,
    },
    rawOutput: pipelineOutput,
  }

  if (!pipelineOutput) return result

  const vlmMatch = pipelineOutput.match(/RADIOLOGIST VLM NARRATIVE:\s*-+\s*(.*?)(?=\n\n|\nSUMMARY:|$)/is)
  if (vlmMatch) {
    result.vlmNarrative = vlmMatch[1].trim()
  }

  const excludePatterns = [
    /total conditions analyzed/i,
    /abnormalities detected/i,
    /conditions ruled out/i,
    /scores range/i,
    /threshold/i,
    /interpretation guide/i,
    /summary/i,
    /findings explanation/i,
    /positive findings/i,
    /negative findings/i,
    /radiological/i,
    /^no abnormalities detected/i,
    /^all analyzed conditions/i,
  ]

  const isValidFinding = (name: string): boolean => {
    const nameLower = name.toLowerCase().trim()
    return !excludePatterns.some((pattern) => pattern.test(nameLower)) && name.length > 3 && name.length < 100
  }

  const positiveMatch = pipelineOutput.match(/POSITIVE FINDINGS \(Detected Abnormalities\):(.*?)(?=NEGATIVE FINDINGS:|RADIOLOGIST VLM NARRATIVE:|SUMMARY:|INTERPRETATION GUIDE:|$)/is)
  if (positiveMatch) {
    const positiveSection = positiveMatch[1]

    const lines = positiveSection.split('\n')
    for (const line of lines) {
      const findingMatch = line.match(/^- ([^:]+): ([\d.]+)/)
      if (findingMatch) {
        const name = findingMatch[1].trim()
        const score = parseFloat(findingMatch[2])

        if (isValidFinding(name) && !isNaN(score) && score >= 0 && score <= 1) {
          result.positiveFindings.push({
            name: name,
            score: score,
          })
        }
      }
    }
  }

  const negativeMatch = pipelineOutput.match(/NEGATIVE FINDINGS \(Conditions Ruled Out\):(.*?)(?=RADIOLOGIST VLM NARRATIVE:|SUMMARY:|INTERPRETATION GUIDE:|$)/is)
  if (negativeMatch) {
    const negativeSection = negativeMatch[1]

    const lines = negativeSection.split('\n')
    for (const line of lines) {
      const findingMatch = line.match(/^- ([^:]+): ([\d.]+)/)
      if (findingMatch) {
        const name = findingMatch[1].trim()
        const score = parseFloat(findingMatch[2])

        if (isValidFinding(name) && !isNaN(score) && score >= 0 && score <= 1) {
          result.negativeFindings.push({
            name: name,
            score: score,
          })
        }
      }
    }
  }

  const summaryMatch = pipelineOutput.match(/SUMMARY:.*?Total conditions analyzed: (\d+).*?Abnormalities detected: (\d+).*?Conditions ruled out: (\d+)/is)
  if (summaryMatch) {
    result.summary.totalConditions = parseInt(summaryMatch[1])
    result.summary.abnormalitiesDetected = parseInt(summaryMatch[2])
    result.summary.conditionsRuledOut = parseInt(summaryMatch[3])
  }

  return result
}


export function parseGPTOutput(gptOutput: string): ParsedGPTOutput {
  const result: ParsedGPTOutput = {
    summary: "",
    explanation: "",
    nextSteps: [],
    keyFindings: [],
    rawOutput: gptOutput,
  }

  if (!gptOutput) return result

  try {

    const jsonMatch = gptOutput.match(/\{[\s\S]*"explanation"[\s\S]*\}/)
    if (jsonMatch) {
      const jsonStr = jsonMatch[0]
      const parsed = JSON.parse(jsonStr)

      if (parsed.explanation) {
        result.explanation = parsed.explanation.trim()
      }
      if (parsed.summary) {
        result.summary = parsed.summary.trim()
      }
      if (parsed.keyFindings && Array.isArray(parsed.keyFindings)) {

        result.keyFindings = parsed.keyFindings
          .filter((f: any) => f && typeof f === 'string' && f.length > 5 && f.length < 100)
          .map((f: string) => f.trim())
      }
      if (parsed.nextSteps && Array.isArray(parsed.nextSteps)) {

        result.nextSteps = parsed.nextSteps
          .filter((s: any) => s && typeof s === 'string' && s.length > 10)
          .map((s: string) => s.trim())
      }
      if (parsed.severity) {
        const validSeverity = ["normal", "mild", "moderate", "severe", "critical"]
        if (validSeverity.includes(parsed.severity)) {
          result.severity = parsed.severity as "normal" | "mild" | "moderate" | "severe" | "critical"
        }
      }
      if (parsed.personalizedNotes) {

        result.explanation = result.explanation + (result.explanation ? "\n\n" : "") + parsed.personalizedNotes.trim()
      }

      if (result.explanation || result.keyFindings.length > 0 || result.nextSteps.length > 0) {
        return result
      }
    }
  } catch (e) {

    console.log("JSON parsing failed, falling back to text parsing:", e)
  }



  let cleanGptOutput = gptOutput

  cleanGptOutput = cleanGptOutput.replace(/### (Stepwise Reasoning|Comparing|Synthesis|Review of Input Data).*?(?=### Patient-Friendly|### |$)/gis, '')

  cleanGptOutput = cleanGptOutput.replace(/\/Guide\*\*:.*?$/gm, '')
  cleanGptOutput = cleanGptOutput.replace(/\/Guide:.*?$/gm, '')
  cleanGptOutput = cleanGptOutput.replace(/Guide\*\*:.*?$/gm, '')
  cleanGptOutput = cleanGptOutput.replace(/The narrative and summary support.*?(?=\n\n|$)/gis, '')
  cleanGptOutput = cleanGptOutput.replace(/- No information here about.*?(?=\n\n|$)/gis, '')

  cleanGptOutput = cleanGptOutput.replace(/^\/Guide[^\n]*$/gm, '')

  cleanGptOutput = cleanGptOutput.replace(/.*[Nn]arrative and summary support.*(?=\n\n|$)/g, '')


  const explanationMatch = cleanGptOutput.match(/### Patient-Friendly Explanation and Next Steps\s*\n\n(.*?)(?=\*\*Next steps:\*\*|\*\*Next Steps:\*\*|##|$)/is)
  if (explanationMatch) {
    let explanation = explanationMatch[1].trim()


    const parts = explanation.split(/What to do next:/i)
    explanation = parts[0].trim()

    explanation = explanation.replace(/\/Guide\*\*:.*$/gm, '')
    explanation = explanation.replace(/\/Guide:.*$/gm, '')
    explanation = explanation.replace(/Guide\*\*:.*$/gm, '')
    explanation = explanation.replace(/The narrative and summary support.*$/gm, '')
    explanation = explanation.replace(/- No information here about.*$/gm, '')
    explanation = explanation.replace(/^\/Guide[^\n]*$/gm, '')

    explanation = explanation.replace(/^\*\*:.*$/gm, '')
    explanation = explanation.replace(/^\*\*.*Not explicitly given.*$/gm, '')

    explanation = explanation.split('\n').filter(line => {
      const l = line.trim().toLowerCase()

      if (!l || l.length < 10) return false
      return !l.includes('/guide') && 
             !l.includes('narrative and summary support') &&
             !l.includes('no information here about') &&
             !l.includes('not explicitly given') &&
             !l.startsWith('guide') &&
             !l.startsWith('**:') &&
             !l.match(/^\*\*.*[Nn]ot explicitly/)
    }).join('\n')

    explanation = explanation.replace(/\n{3,}/g, '\n\n').trim()
    result.explanation = explanation.replace(/\*\*/g, "").trim()
  } else {

    const altExplanation = cleanGptOutput.match(/### Patient-Friendly Explanation\s*\n\n(.*?)(?=###|##|\*\*Next steps:\*\*|\*\*Next Steps:\*\*|$)/is)
    if (altExplanation) {
      let explanation = altExplanation[1].trim()

      explanation = explanation.split(/What to do next:/i)[0].trim()

      explanation = explanation.replace(/\/Guide\*\*:.*$/gm, '')
      explanation = explanation.replace(/The narrative and summary support.*$/gm, '')
      explanation = explanation.replace(/^\*\*:.*$/gm, '')
      result.explanation = explanation.replace(/\*\*/g, "").trim()
    } else {

      const paraMatch = cleanGptOutput.match(/(?:There is|Your scan shows|The analysis reveals|We found)(.*?)(?=\n\n\n|\*\*Next steps:\*\*|###|##|$)/is)
      if (paraMatch) {
        let explanation = paraMatch[0].trim()

        explanation = explanation.split(/What to do next:/i)[0].trim()

        explanation = explanation.replace(/\/Guide\*\*:.*$/gm, '')
        explanation = explanation.replace(/^\*\*:.*$/gm, '')
        result.explanation = explanation.replace(/\*\*/g, "").trim()
      } else {


        const allParagraphs = cleanGptOutput.split(/\n\n+/)
        const patientFriendlyParagraphs: string[] = []
        for (const para of allParagraphs) {
          const trimmed = para.trim()
          if (trimmed.length > 50 && 
              !trimmed.match(/^###/) &&
              !trimmed.toLowerCase().includes('/guide') &&
              !trimmed.toLowerCase().includes('stepwise reasoning') &&
              !trimmed.toLowerCase().includes('comparing') &&
              !trimmed.toLowerCase().includes('synthesis') &&
              !trimmed.startsWith('**:') &&
              (trimmed.match(/^(There is|Your scan|The analysis|We found|Your heart|The good news)/i))) {
            patientFriendlyParagraphs.push(trimmed)
          }

          if (trimmed.match(/^\*\*Next steps?:\*\*/i)) break

          if (patientFriendlyParagraphs.length >= 4) break
        }
        if (patientFriendlyParagraphs.length > 0) {
          result.explanation = patientFriendlyParagraphs.join('\n\n').replace(/\*\*/g, "").trim()
        }
      }
    }
  }

  const nextStepsMatch = gptOutput.match(/\*\*Next steps?:\*\*\s*\n\n(.*?)(?=\n\n\n|$)/is)
  if (nextStepsMatch) {
    const stepsText = nextStepsMatch[1]

    const steps = stepsText
      .split(/\n/)
      .map((step) => step.trim())
      .filter((step) => {
        const cleaned = step.replace(/^[-•*]\s*/, "").trim()
        return cleaned.length > 10 && (cleaned.toLowerCase().includes("follow") || cleaned.toLowerCase().includes("doctor") || cleaned.toLowerCase().includes("appointment") || cleaned.toLowerCase().includes("seek") || cleaned.toLowerCase().includes("help"))
      })
      .map((step) => step.replace(/^[-•*]\s*/, "").replace(/\*\*/g, "").trim())
    
    if (steps.length > 0) {
      result.nextSteps = steps
    } else {

      const inlineSteps = stepsText
        .split(/[-•*]\s*/)
        .map((step) => step.trim().replace(/\*\*/g, ""))
        .filter((step) => step.length > 10)
      if (inlineSteps.length > 0) {
        result.nextSteps = inlineSteps
      }
    }
  } else {

    const allBullets = gptOutput.matchAll(/- ([^\n]+(?:\n[^\n-]+)*)/g)
    const steps: string[] = []
    for (const match of allBullets) {
      const step = match[1].trim().replace(/\*\*/g, "")
      if (step.length > 20 && (
        step.toLowerCase().includes("follow") || 
        step.toLowerCase().includes("doctor") || 
        step.toLowerCase().includes("appointment") ||
        step.toLowerCase().includes("consult") ||
        step.toLowerCase().includes("seek")
      )) {
        steps.push(step)
      }
    }
    if (steps.length > 0) {
      result.nextSteps = steps.slice(0, 5)
    }
  }

  const isActualFinding = (text: string): boolean => {
    const lower = text.toLowerCase()

    const excludePhrases = [
      "may be related to",
      "related to",
      "due to",
      "caused by",
      "supports",
      "indicates",
      "suggests",
      "possible",
      "likely",
      "secondary",
      "not mentioned",
      "overlap",
      "less visually",
      "pressure/shift effects",
      "pressure effects",
      "shift effects",
      "if you have",
      "let your doctor know",
      "get medical help",
      "watch for",
      "bring up any questions",
      "your care team",
      "talk with your doctor",
      "what to do next"
    ]

    if (excludePhrases.some(phrase => lower.includes(phrase))) {
      return false
    }

    if (text.split(/\s+/).length < 3) {
      return false
    }

    if (lower.includes("because") || lower.includes("since") || lower.startsWith("this") || lower.startsWith("that")) {
      return false
    }
    
    return true
  }

  const synthesisMatch = cleanGptOutput.match(/Strong, consistent evidence for:.*?\* ([^*\n]+)\* ([^*\n]+)\* ([^*\n]+)/is)
  if (synthesisMatch) {
    const findings = [
      synthesisMatch[1].trim(),
      synthesisMatch[2].trim(),
      synthesisMatch[3].trim()
    ]

    result.keyFindings = findings
      .map(f => {

        let cleaned = f.replace(/\*\*/g, "").trim()

        cleaned = cleaned.replace(/\(\d+\.\d+\):\s*/g, '')

        cleaned = cleaned.replace(/â€”[^â€”]+$/g, '').trim()

        cleaned = cleaned.replace(/\([^)]*\)$/g, '').trim()
        return cleaned
      })
      .filter(f => {
        const fLower = f.toLowerCase()

        if (!fLower.includes("indicates an intervention") && 
            !fLower.includes("not mentioned in vlm") &&
            !fLower.includes("supports mass finding") &&
            !fLower.includes("enlarged lymph nodes in chest, possible with") &&
            f.length > 10 && f.length < 100) {

          return isActualFinding(f)
        }
        return false
      })
      .slice(0, 4)
  } else {

    const likelyMatch = cleanGptOutput.match(/Likely[:\s]*(.*?)(?=\n\n|###|$)/is)
    if (likelyMatch) {
      const findingsText = likelyMatch[1]
      result.keyFindings = findingsText
        .split(/[-•*]\s*/)
        .map((f) => {
          let cleaned = f.trim().replace(/\*\*/g, "")

          cleaned = cleaned.replace(/\(\d+\.\d+\):\s*/g, '')
          cleaned = cleaned.replace(/â€”[^â€”]+$/g, '').trim()
          return cleaned
        })
        .filter((f) => {
          const fLower = f.toLowerCase()
          return f.length > 10 && 
                 f.length < 100 &&
                 !fLower.includes("indicates an intervention") &&
                 !fLower.includes("not mentioned in vlm") &&
                 !fLower.includes("supports") &&
                 !fLower.includes("possible with") &&
                 isActualFinding(f)
        })
        .slice(0, 4)
    } else {


      result.keyFindings = []
    }
  }

  result.keyFindings = result.keyFindings.map(f => {

    let cleaned = f.replace(/\(\d+\.\d+\):\s*/g, '')

    cleaned = cleaned.replace(/â€”[^â€”]+$/g, '').trim()
    cleaned = cleaned.replace(/â€”.*$/g, '').trim()

    if (cleaned.length > 0 && cleaned[0] === cleaned[0].toLowerCase()) {
      cleaned = cleaned[0].toUpperCase() + cleaned.slice(1)
    }
    return cleaned.trim()
  }).filter(f => {

    return f.length > 10 && f.length < 100 && isActualFinding(f)
  })

  const outputLower = gptOutput.toLowerCase()
  if (outputLower.includes("critical") || outputLower.includes("severe") || outputLower.includes("urgent") || outputLower.includes("immediate")) {
    result.severity = "critical"
  } else if (outputLower.includes("severe")) {
    result.severity = "severe"
  } else if (outputLower.includes("moderate")) {
    result.severity = "moderate"
  } else if (outputLower.includes("mild") || outputLower.includes("minor")) {
    result.severity = "mild"
  } else if (outputLower.includes("normal") || outputLower.includes("no significant") || outputLower.includes("clear")) {
    result.severity = "normal"
  } else {

    result.severity = "moderate"
  }

  const summaryMatch = gptOutput.match(/(?:###\s*)?(?:Summary|Overview)[:\s]*(.*?)(?=\n\n|###|$)/is)
  if (summaryMatch) {
    let summary = summaryMatch[1].trim()

    if (!summary.includes('**:') && !summary.toLowerCase().includes('not explicitly given') && !summary.toLowerCase().includes('formatted output')) {
      result.summary = summary.substring(0, 300)
    }
  } else {

    const paragraphs = gptOutput.split(/\n\n+/).filter((p) => {
      const trimmed = p.trim()
      return trimmed.length > 50 && 
             !trimmed.includes('**:') && 
             !trimmed.toLowerCase().includes('not explicitly given') &&
             !trimmed.toLowerCase().includes('formatted output') &&
             !trimmed.toLowerCase().includes('mirrors the key findings')
    })
    if (paragraphs.length > 0) {
      result.summary = paragraphs[0].trim().substring(0, 300)
    }
  }

  return result
}


export function determineSeverityFromPipeline(parsed: ParsedPipelineOutput): "normal" | "mild" | "moderate" | "severe" | "critical" {
  const positiveCount = parsed.positiveFindings.length
  const highScoreFindings = parsed.positiveFindings.filter((f) => f.score > 0.9).length

  const criticalFindings = ["pneumothorax", "whole lung collapse", "lung collapse", "tracheal deviation"]
  const hasCritical = parsed.positiveFindings.some((f) => criticalFindings.some((cf) => f.name.toLowerCase().includes(cf.toLowerCase())))

  if (hasCritical && highScoreFindings >= 3) {
    return "critical"
  } else if (positiveCount >= 5 || highScoreFindings >= 2) {
    return "severe"
  } else if (positiveCount >= 3) {
    return "moderate"
  } else if (positiveCount >= 1) {
    return "mild"
  } else {
    return "normal"
  }
}

