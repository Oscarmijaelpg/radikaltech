import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

export const exportToPDF = async (
  elementId: string,
  fileName: string = 'informe-radikal.pdf',
  _data?: unknown,
) => {
  const originalElement = document.getElementById(elementId);
  if (!originalElement) return;

  // Proxy de estilos para interceptar colores oklch() que rompen html2canvas
  const originalGetComputedStyle = window.getComputedStyle;
  const styleProxy = (el: Element, pseudo?: string | null) => {
    const style = originalGetComputedStyle(el, pseudo);
    return new Proxy(style, {
      get(target, prop: string) {
        const value = target[prop as keyof CSSStyleDeclaration];
        if (typeof value === 'string' && value.includes('oklch')) {
          if (prop.toLowerCase().includes('color')) {
            if (prop === 'backgroundColor') return '#ffffff';
            return '#1e293b';
          }
          return '#FF1493';
        }
        return value;
      },
    }) as CSSStyleDeclaration;
  };

  window.getComputedStyle = styleProxy as typeof window.getComputedStyle;

  const container = document.createElement('div');
  container.id = 'radikal-pdf-temp-container';
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 190mm;
    background: #ffffff;
    z-index: -9999;
    visibility: visible;
    pointer-events: none;
    font-family: 'Helvetica', 'Arial', sans-serif;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    padding: 15mm 20mm 10mm 20mm;
    border-bottom: 4px solid #FF1493;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #ffffff;
  `;
  header.innerHTML = `
    <div style="font-size: 28px; font-weight: 900; color: #000;">RADIKAL<span style="color: #FF1493;">IA</span></div>
    <div style="text-align: right; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">
      Informe Estratégico | ${new Date().toLocaleDateString('es-ES')}
    </div>
  `;

  const content = originalElement.cloneNode(true) as HTMLElement;
  content.style.padding = '0 20mm 20mm 20mm';
  content.style.background = '#ffffff';
  const buttons = content.querySelectorAll('button, .no-print');
  buttons.forEach((b) => ((b as HTMLElement).style.display = 'none'));

  container.appendChild(header);
  container.appendChild(content);
  document.body.appendChild(container);

  try {
    await new Promise((r) => setTimeout(r, 500));

    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      hotfixes: ['px_scaling'],
    });

    await doc.html(container, {
      callback: function (pdf) {
        const pageCount = pdf.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          pdf.setPage(i);
          pdf.setFontSize(8);
          pdf.setTextColor(150);
          pdf.text(`Página ${i} de ${pageCount}`, 210 - 25, 297 - 10, { align: 'right' });
        }
        pdf.save(fileName);
        window.getComputedStyle = originalGetComputedStyle;
        document.body.removeChild(container);
      },
      x: 0,
      y: 0,
      width: 210,
      windowWidth: 793,
      autoPaging: 'text',
      margin: [15, 10, 15, 10],
    });
  } catch (error) {
    console.error('Error Fatal en PDF:', error);
    window.getComputedStyle = originalGetComputedStyle;
    if (document.body.contains(container)) document.body.removeChild(container);
    alert('Hubo un problema técnico al procesar el informe. Por favor, intente con Google Chrome.');
  }
};

export const exportToWord = async (content: string, title: string = 'Informe Detallado') => {
  const cleanMarkdown = (text: string) => {
    return text
      .replace(/^#+\s+/gm, '')
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^\s*[-*+]\s+/gm, '• ');
  };

  const cleanContent = cleanMarkdown(content);
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Generado por Radikal IA - ${new Date().toLocaleDateString()}`,
                italics: true,
                size: 20,
                color: '666666',
              }),
            ],
            spacing: { after: 400 },
          }),
          ...cleanContent.split('\n').map((line) => {
            if (line.trim().startsWith('•')) {
              return new Paragraph({
                children: [new TextRun(line.trim().substring(2))],
                bullet: { level: 0 },
                spacing: { after: 120 },
              });
            }
            if (line.trim()) {
              return new Paragraph({
                children: [new TextRun(line.trim())],
                spacing: { after: 200 },
              });
            }
            return new Paragraph({ text: '' });
          }),
        ],
      },
    ],
  });

  try {
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${title.toLowerCase().replace(/\s+/g, '-')}.docx`);
  } catch (error) {
    console.error('Error generating Word:', error);
  }
};
