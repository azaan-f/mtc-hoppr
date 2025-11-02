let jsPDF: any = null

interface PDFData {
  findingSummary: string
  severity: string
  confidenceScore: number
  explanation: string
  keyFindings: string[]
  positiveFindings: Array<{ name: string; score: number }>
  negativeFindings: Array<{ name: string }>
  nextSteps: string[]
  patientInfo?: {
    name?: string
    dateOfBirth?: string
    examDate?: string
  }
}

export async function generatePDF(data: PDFData): Promise<void> {
  if (!jsPDF) {
    try {
      const jsPDFModule = await import('jspdf')
      jsPDF = jsPDFModule.default
    } catch (error) {
      console.error('Failed to load jsPDF:', error)
      alert('PDF generation is not available. Please install jspdf: npm install jspdf')
      return
    }
  }
  
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const maxWidth = pageWidth - 2 * margin
  let yPosition = margin

  const checkPageBreak = (requiredSpace: number = 20) => {
    if (yPosition + requiredSpace > pageHeight - 30) {
      doc.addPage()
      yPosition = margin
      return true
    }
    return false
  }

  const addWrappedText = (text: string, fontSize: number, isBold: boolean = false, color: string = '#000000', lineHeight: number = 1.4) => {
    doc.setFontSize(fontSize)
    if (isBold) {
      doc.setFont(undefined, 'bold')
    } else {
      doc.setFont(undefined, 'normal')
    }
    doc.setTextColor(color)
    
    const lines = doc.splitTextToSize(text, maxWidth)
    lines.forEach((line: string) => {
      checkPageBreak(fontSize * lineHeight)
      doc.text(line, margin, yPosition)
      yPosition += fontSize * lineHeight * 0.35
    })
    yPosition += fontSize * 0.2
  }

  const addSectionHeader = (text: string, fontSize: number = 14) => {
    checkPageBreak(20)
    yPosition += 10
    doc.setFontSize(fontSize)
    doc.setFont(undefined, 'bold')
    doc.setTextColor('#1f2937')
    doc.text(text, margin, yPosition)
    yPosition += 8
    doc.setDrawColor('#e5e7eb')
    doc.setLineWidth(0.5)
    doc.line(margin, yPosition - 3, pageWidth - margin, yPosition - 3)
    yPosition += 5
  }

  const addSpacing = (amount: number = 5) => {
    yPosition += amount
  }

  doc.setFillColor('#6366f1')
  doc.rect(0, 0, pageWidth, 40, 'F')
  
  doc.setFontSize(24)
  doc.setFont(undefined, 'bold')
  doc.setTextColor('#ffffff')
  doc.text('Your Radiology Report', pageWidth / 2, 25, { align: 'center' })
  
  yPosition = 50

  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  doc.setFillColor('#f9fafb')
  doc.roundedRect(margin, yPosition, maxWidth, 15, 2, 2, 'F')
  
  doc.setFontSize(9)
  doc.setFont(undefined, 'normal')
  doc.setTextColor('#6b7280')
  doc.text(`Report Generated: ${currentDate}`, margin + 5, yPosition + 10)
  
  if (data.patientInfo?.examDate) {
    doc.text(`Exam Date: ${data.patientInfo.examDate}`, pageWidth / 2, yPosition + 10)
  }
  
  yPosition += 25

  addSectionHeader('Key Finding', 16)
  
  const severityColors: { [key: string]: { bg: string, text: string } } = {
    normal: { bg: '#d1fae5', text: '#065f46' },
    mild: { bg: '#fef3c7', text: '#92400e' },
    moderate: { bg: '#fed7aa', text: '#9a3412' },
    severe: { bg: '#fce7f3', text: '#831843' },
    critical: { bg: '#fee2e2', text: '#991b1b' }
  }

  const severityColor = severityColors[data.severity] || { bg: '#f3f4f6', text: '#374151' }
  
  checkPageBreak(25)
  doc.setFillColor(severityColor.bg)
  doc.roundedRect(margin, yPosition, maxWidth, 22, 4, 4, 'F')
  
  doc.setFontSize(10)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(severityColor.text)
  doc.text(data.severity.toUpperCase(), margin + 8, yPosition + 8)
  
  doc.setFontSize(12)
  doc.setFont(undefined, 'bold')
  doc.setTextColor('#1f2937')
  const severityLines = doc.splitTextToSize(data.findingSummary, maxWidth - 16)
  doc.text(severityLines[0], margin + 8, yPosition + 15)
  if (severityLines.length > 1) {
    doc.text(severityLines[1], margin + 8, yPosition + 20)
    yPosition += 5
  }
  yPosition += 25

  checkPageBreak(15)
  doc.setFillColor('#f0f9ff')
  doc.roundedRect(margin, yPosition, maxWidth / 2, 12, 3, 3, 'F')
  doc.setFontSize(11)
  doc.setFont(undefined, 'bold')
  doc.setTextColor('#1e40af')
  doc.text('AI Confidence Level', margin + 5, yPosition + 7)
  doc.setFontSize(13)
  doc.setTextColor('#1f2937')
  doc.text(`${data.confidenceScore}%`, margin + 5, yPosition + 11)
  yPosition += 18

  if (data.explanation) {
    addSectionHeader('What This Means for You', 14)
    
    doc.setFontSize(11)
    doc.setFont(undefined, 'normal')
    doc.setTextColor('#374151')
    const explanationParagraphs = data.explanation.split('\n\n').filter(p => p.trim())
    explanationParagraphs.forEach((para, idx) => {
      if (idx > 0) addSpacing(5)
      addWrappedText(para.trim(), 11, false, '#374151', 1.5)
    })
    addSpacing(8)
  }

  if (data.keyFindings && data.keyFindings.length > 0) {
    addSectionHeader('Key Findings', 14)
    
    doc.setFontSize(11)
    doc.setFont(undefined, 'normal')
    doc.setTextColor('#374151')
    data.keyFindings.forEach((finding, idx) => {
      checkPageBreak(12)
      doc.setFillColor('#6366f1')
      doc.circle(margin + 3, yPosition - 2, 1.5, 'F')
      const lines = doc.splitTextToSize(finding, maxWidth - 20)
      doc.text(lines[0], margin + 12, yPosition)
      yPosition += Math.max(lines.length * 5, 8)
      if (lines.length > 1) {
        doc.text(lines[1], margin + 12, yPosition)
        yPosition += 5
      }
    })
    addSpacing(5)
  }

  if (data.positiveFindings && data.positiveFindings.length > 0) {
    addSectionHeader(`Detected Abnormalities (${data.positiveFindings.length})`, 14)
    
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.setTextColor('#374151')
    
    data.positiveFindings.forEach((finding, idx) => {
      checkPageBreak(15)
      
      if (idx % 2 === 0) {
        doc.setFillColor('#f9fafb')
        doc.rect(margin, yPosition - 5, maxWidth, 10, 'F')
      }
      
      doc.setFont(undefined, 'bold')
      doc.setTextColor('#1f2937')
      const nameLines = doc.splitTextToSize(finding.name, maxWidth - 50)
      doc.text(nameLines[0], margin + 5, yPosition)
      
      const confidence = Math.round(finding.score * 100)
      doc.setFont(undefined, 'normal')
      doc.setTextColor('#6b7280')
      doc.text(`${confidence}%`, pageWidth - margin - 5, yPosition, { align: 'right' })
      
      yPosition += Math.max(nameLines.length * 5, 10)
    })
    addSpacing(5)
  }

  if (data.nextSteps && data.nextSteps.length > 0) {
    addSectionHeader('Recommended Next Steps', 14)
    
    doc.setFontSize(11)
    doc.setFont(undefined, 'normal')
    doc.setTextColor('#374151')
    
    data.nextSteps.forEach((step, idx) => {
      checkPageBreak(20)
      
      const circleX = margin + 5
      const circleY = yPosition - 1
      const textStartX = margin + 16
      const textMaxWidth = maxWidth - 22
      const circleRadius = 4
      
      doc.setFillColor('#6366f1')
      doc.circle(circleX, circleY, circleRadius, 'F')
      
      doc.setFontSize(8)
      doc.setFont(undefined, 'bold')
      doc.setTextColor('#ffffff')
      doc.text(String(idx + 1), circleX, circleY + 1, { align: 'center' })
      
      doc.setFontSize(11)
      doc.setFont(undefined, 'normal')
      doc.setTextColor('#374151')
      
      const stepLines = doc.splitTextToSize(step.trim(), textMaxWidth)
      stepLines.forEach((line: string) => {
        checkPageBreak(8)
        doc.text(line, textStartX, yPosition)
        yPosition += 6
      })
      
      addSpacing(4)
    })
    addSpacing(5)
  }

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    
    doc.setFontSize(9)
    doc.setFont(undefined, 'normal')
    doc.setTextColor('#9ca3af')
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 20,
      { align: 'center' }
    )
    
    doc.setFillColor('#fef3c7')
    doc.rect(margin, pageHeight - 30, maxWidth, 18, 'F')
    
    doc.setFontSize(8)
    doc.setFont(undefined, 'bold')
    doc.setTextColor('#92400e')
    doc.text('Important Disclaimer', margin + 5, pageHeight - 23)
    
    doc.setFontSize(7)
    doc.setFont(undefined, 'normal')
    doc.setTextColor('#78350f')
    const disclaimerText = 'This report is generated by AI analysis and should be reviewed with your healthcare provider. This is not a substitute for professional medical advice.'
    const disclaimerLines = doc.splitTextToSize(disclaimerText, maxWidth - 10)
    disclaimerLines.forEach((line: string, lineIdx: number) => {
      doc.text(line, margin + 5, pageHeight - 16 + (lineIdx * 5), { align: 'left' })
    })
  }

  let filename = 'Radiology_Report'
  if (data.patientInfo?.name) {
    const nameParts = data.patientInfo.name.split(' ')
    if (nameParts.length > 0) {
      filename += `_${nameParts[0]}`
    }
  }
  filename += `_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}
