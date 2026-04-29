
export const extractTextFromPdf = async (file: File): Promise<string> => {
  try {
    // Dynamically load PDF.js from CDN
    const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) { // Limit to 10 pages for performance
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      fullText += strings.join(' ') + '\n\n';
    }

    return fullText || 'No se pudo extraer texto legible del PDF.';
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    return 'Error al procesar el contenido del PDF.';
  }
};
