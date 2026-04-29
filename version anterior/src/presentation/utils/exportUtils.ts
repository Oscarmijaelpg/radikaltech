
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

export const exportToPDF = async (elementId: string, fileName: string = 'informe-radikal.pdf', data?: any) => {
    const originalElement = document.getElementById(elementId);
    if (!originalElement) return;

    // --- EL REMEDIO DEFINITIVO: PROXY DE ESTILOS ---
    // Interceptamos todos los intentos de leer colores oklch() que rompen html2canvas
    const originalGetComputedStyle = window.getComputedStyle;
    const styleProxy = (el: Element, pseudo?: string | null) => {
        const style = originalGetComputedStyle(el, pseudo);
        return new Proxy(style, {
            get(target, prop: string) {
                const value = target[prop as keyof CSSStyleDeclaration];
                if (typeof value === 'string' && value.includes('oklch')) {
                    // Fallback a colores sólidos seguros para el motor de PDF
                    if (prop.toLowerCase().includes('color')) {
                        if (prop === 'backgroundColor') return '#ffffff';
                        return '#1e293b';
                    }
                    return '#FF1493';
                }
                return value;
            }
        }) as CSSStyleDeclaration;
    };

    // Aplicamos el proxy globalmente durante la generación
    window.getComputedStyle = styleProxy as any;

    // 1. Preparar contenedor temporal
    const container = document.createElement('div');
    container.id = 'radikal-pdf-temp-container';
    // Estilos críticos para evitar hojas en blanco y asegurar renderizado
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

    // 2. Encabezado de Branding
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

    // 3. Clonar y limpiar contenido
    const content = originalElement.cloneNode(true) as HTMLElement;
    // Forzamos fondo blanco y quitamos botones
    content.style.padding = '0 20mm 20mm 20mm';
    content.style.background = '#ffffff';
    const buttons = content.querySelectorAll('button, .no-print');
    buttons.forEach(b => (b as HTMLElement).style.display = 'none');

    container.appendChild(header);
    container.appendChild(content);
    document.body.appendChild(container);

    try {
        // Pequeño delay para que el navegador asiente los estilos proxeados
        await new Promise(r => setTimeout(r, 500));

        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
            hotfixes: ['px_scaling']
        });

        await doc.html(container, {
            callback: function (pdf) {
                // Agregar numeración de páginas (opcional pero profesional)
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
            autoPaging: 'text', // 'text' es mejor para evitar cortes a mitad de línea
            margin: [15, 10, 15, 10] // Márgenes consistentes
        });
    } catch (error) {
        console.error('Error Fatal en PDF:', error);
        window.getComputedStyle = originalGetComputedStyle;
        if (document.body.contains(container)) document.body.removeChild(container);
        alert('Hubo un problema técnico al procesar el informe. Por favor, intente con Google Chrome.');
    }
};

export const exportToWord = async (content: string, title: string = 'Informe Detallado') => {
    // Función para limpiar markdown básico
    const cleanMarkdown = (text: string) => {
        return text
            // Eliminar encabezados markdown (#, ##, ###)
            .replace(/^#+\s+/gm, '')
            // Eliminar negritas/cursivas markdown (**, *, __, _)
            .replace(/(\*\*|__)(.*?)\1/g, '$2')
            .replace(/(\*|_)(.*?)\1/g, '$2')
            // Eliminar enlaces markdown [texto](url) -> texto (url)
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
            // Eliminar bloques de código
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`([^`]+)`/g, '$1')
            // Limpiar listas
            .replace(/^\s*[-*+]\s+/gm, '• ')
            .replace(/^\s*\d+\.\s+/gm, (match) => match);
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
                        spacing: { after: 300 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `Generado por Radikal IA - ${new Date().toLocaleDateString()}`,
                                italics: true,
                                size: 20, // 10pt
                                color: "666666"
                            }),
                        ],
                        spacing: { after: 400 }
                    }),
                    ...cleanContent.split('\n').map(line => {
                        // Detectar si es un item de lista
                        if (line.trim().startsWith('•')) {
                            return new Paragraph({
                                children: [new TextRun(line.trim().substring(2))],
                                bullet: { level: 0 },
                                spacing: { after: 120 }
                            });
                        }
                        
                        // Párrafos normales
                        if (line.trim()) {
                            return new Paragraph({
                                children: [new TextRun(line.trim())],
                                spacing: { after: 200 }
                            });
                        }
                        
                        return new Paragraph({ text: "" });
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
