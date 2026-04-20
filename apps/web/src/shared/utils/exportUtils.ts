import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

/**
 * Renderiza un string HTML a PDF en un iframe aislado y paginado.
 *
 * - iframe aislado: nada del CSS de la app se filtra (sin oklch, sin Tailwind).
 * - html2canvas directo: control total sobre el render, sin parches globales
 *   que desajusten la página visible.
 * - Paginación A4 automática: divide el canvas resultante en páginas.
 */
export const exportHtmlToPDF = async (html: string, fileName: string) => {
  const A4_W_MM = 210;
  const A4_H_MM = 297;
  const RENDER_PX = 793; // ~210mm a 96 DPI

  const iframe = document.createElement('iframe');
  iframe.style.cssText = `
    position: fixed;
    top: -10000px;
    left: -10000px;
    width: ${RENDER_PX}px;
    height: 100px;
    border: 0;
    visibility: hidden;
  `;
  document.body.appendChild(iframe);

  const idoc = iframe.contentDocument;
  if (!idoc) {
    document.body.removeChild(iframe);
    throw new Error('No se pudo crear el iframe para el PDF');
  }

  idoc.open();
  idoc.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"></head><body style="margin:0;padding:0;">${html}</body></html>`,
  );
  idoc.close();

  // Espera imágenes (logo + avatar) antes de rasterizar
  const imgs = Array.from(idoc.images);
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          // Timeout para no colgar si la imagen no responde
          setTimeout(resolve, 3000);
        }),
    ),
  );

  // Pequeño delay para permitir el layout final
  await new Promise((r) => setTimeout(r, 150));

  try {
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const MARGIN_MM = 10;
    const PAGE_USABLE_H_MM = A4_H_MM - MARGIN_MM * 2;

    // Render sección por sección para respetar page-breaks visualmente.
    // Si el HTML envuelve todo en un .page wrapper, iteramos sus hijos.
    const root =
      (idoc.body.querySelector('.page') as HTMLElement | null) ?? idoc.body;
    const blocks = Array.from(root.children) as HTMLElement[];
    let currentY = MARGIN_MM;

    for (const block of blocks) {
      const canvas = await html2canvas(block, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const blockH_mm = (canvas.height * (A4_W_MM - MARGIN_MM * 2)) / canvas.width;
      const blockW_mm = A4_W_MM - MARGIN_MM * 2;

      // Si la sección no cabe en lo que queda de página, nueva página
      if (currentY + blockH_mm > A4_H_MM - MARGIN_MM && currentY > MARGIN_MM) {
        pdf.addPage();
        currentY = MARGIN_MM;
      }

      // Si la sección por sí sola es más alta que una página, la partimos
      if (blockH_mm > PAGE_USABLE_H_MM) {
        // Partimos el canvas en rebanadas que caben
        const pxPerMM = canvas.width / blockW_mm;
        const sliceH_px = PAGE_USABLE_H_MM * pxPerMM;
        const totalSlices = Math.ceil(canvas.height / sliceH_px);
        for (let s = 0; s < totalSlices; s++) {
          if (s > 0 || currentY > MARGIN_MM) {
            pdf.addPage();
            currentY = MARGIN_MM;
          }
          const startY = s * sliceH_px;
          const thisSliceH_px = Math.min(sliceH_px, canvas.height - startY);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = thisSliceH_px;
          const ctx = sliceCanvas.getContext('2d');
          if (!ctx) continue;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            startY,
            canvas.width,
            thisSliceH_px,
            0,
            0,
            canvas.width,
            thisSliceH_px,
          );
          const img = sliceCanvas.toDataURL('image/jpeg', 0.92);
          const thisSliceH_mm = (thisSliceH_px / canvas.width) * blockW_mm;
          pdf.addImage(img, 'JPEG', MARGIN_MM, currentY, blockW_mm, thisSliceH_mm);
          currentY += thisSliceH_mm;
        }
      } else {
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        pdf.addImage(imgData, 'JPEG', MARGIN_MM, currentY, blockW_mm, blockH_mm);
        currentY += blockH_mm + 3; // gap entre secciones
      }
    }

    // Pie con paginación
    const total = pdf.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`${i} / ${total}`, A4_W_MM - 15, A4_H_MM - 5, { align: 'right' });
    }

    pdf.save(fileName);
  } catch (err) {
    console.error('[pdf] generation failed', err);
    throw err;
  } finally {
    if (document.body.contains(iframe)) document.body.removeChild(iframe);
  }
};

export const exportToPDF = async (
  elementId: string,
  fileName: string = 'informe-radikal.pdf',
  _data?: unknown,
) => {
  const originalElement = document.getElementById(elementId);
  if (!originalElement) return;

  // Proxy de estilos para interceptar colores oklch() que rompen html2canvas.
  // Notas:
  // - getComputedStyle debe llamarse con this=window (bind explícito).
  // - Cuando el Proxy devuelve un método de CSSStyleDeclaration
  //   (getPropertyValue, item, etc.), hay que bindearlo al target original
  //   o rompe con "Illegal invocation" al invocarse.
  const originalGetComputedStyle = window.getComputedStyle.bind(window);
  const styleProxy = function (el: Element, pseudo?: string | null) {
    const style = originalGetComputedStyle(el, pseudo);
    return new Proxy(style, {
      get(target, prop: string | symbol) {
        const value = Reflect.get(target, prop);
        if (typeof value === 'function') {
          return (value as (...args: unknown[]) => unknown).bind(target);
        }
        if (typeof prop === 'string' && typeof value === 'string' && value.includes('oklch')) {
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
