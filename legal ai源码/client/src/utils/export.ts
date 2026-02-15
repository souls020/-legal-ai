// Export Utility - Handle document export to various formats
import type { ExportOptions } from '../components/ExportModal';

// Get font family CSS value
const getFontFamily = (font: ExportOptions['fontFamily']): string => {
  const fonts: Record<string, string> = {
    SimSun: '"SimSun", "Songti SC", serif',
    SimHei: '"SimHei", "Microsoft YaHei", sans-serif',
    Arial: 'Arial, sans-serif',
  };
  return fonts[font] || fonts.SimSun;
};

// Get margin values in cm
const getMargins = (margins: ExportOptions['margins']): { top: number; bottom: number; left: number; right: number } => {
  const marginValues: Record<string, { top: number; bottom: number; left: number; right: number }> = {
    narrow: { top: 0.59, bottom: 0.59, left: 0.79, right: 0.79 },
    normal: { top: 0.98, bottom: 0.98, left: 1.27, right: 1.27 },
    wide: { top: 1.18, bottom: 1.18, left: 1.59, right: 1.59 },
  };
  return marginValues[margins] || marginValues.normal;
};

// Sanitize filename
const sanitizeFileName = (name: string): string => {
  return name.replace(/[\/\\?%*:|"<>]/g, '-').trim();
};

// Download blob as file
const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export to TXT format
const exportToTxt = (content: string, title: string, _options: ExportOptions): void => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const fileName = `${sanitizeFileName(title)}.txt`;
  downloadBlob(blob, fileName);
};

// Export to DOCX format (HTML-based)
const exportToDocx = (content: string, title: string, options: ExportOptions): void => {
  const fontFamily = getFontFamily(options.fontFamily);
  const margins = getMargins(options.margins);

  // Create HTML document for DOCX conversion
  const htmlContent = `
    <!DOCTYPE html>
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        @page {
          size: A4;
          margin: ${margins.top}cm ${margins.right}cm ${margins.bottom}cm ${margins.left}cm;
        }
        body {
          font-family: ${fontFamily};
          font-size: ${options.fontSize}pt;
          line-height: ${options.lineHeight};
          margin: 0;
          padding: 0;
          white-space: pre-wrap;
          word-break: break-word;
        }
        @media print {
          body {
            margin: 0;
          }
        }
      </style>
    </head>
    <body>
      ${content.replace(/\n/g, '<br>')}
    </body>
    </html>
  `;

  const blob = new Blob([htmlContent], {
    type: 'application/msword;charset=utf-8',
  });
  const fileName = `${sanitizeFileName(title)}.doc`;
  downloadBlob(blob, fileName);
};

// Export to PDF format (using browser print)
const exportToPdf = (content: string, title: string, options: ExportOptions): Promise<void> => {
  return new Promise((resolve, reject) => {
    const fontFamily = getFontFamily(options.fontFamily);
    const margins = getMargins(options.margins);

    // Create print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      reject(new Error('无法打开打印窗口，请检查浏览器设置'));
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          @page {
            size: A4;
            margin: ${margins.top}cm ${margins.right}cm ${margins.bottom}cm ${margins.left}cm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: ${fontFamily};
            font-size: ${options.fontSize}pt;
            line-height: ${options.lineHeight};
            margin: 0;
            padding: 0;
            white-space: pre-wrap;
            word-break: break-word;
          }
          .document-title {
            text-align: center;
            font-size: ${options.fontSize + 4}pt;
            font-weight: bold;
            margin-bottom: 24px;
          }
          .document-content {
            text-align: justify;
          }
          @media print {
            body {
              margin: 0;
            }
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: center; padding: 20px; background: #f5f5f5; border-bottom: 1px solid #ddd;">
          <button
            onclick="window.print();"
            style="padding: 12px 24px; font-size: 16px; cursor: pointer; background: #1890ff; color: white; border: none; border-radius: 4px;"
          >
            打印 / 保存为 PDF
          </button>
          <p style="margin-top: 12px; color: #666; font-size: 12px;">
            或按 Ctrl+P (Cmd+P) 打开打印对话框
          </p>
        </div>
        <div class="document-content" style="padding: 20px;">
          <h1 class="document-title">${title}</h1>
          <div>${content.replace(/\n/g, '<br>')}</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    // Resolve immediately - user will handle the actual PDF save
    resolve();
  });
};

// Main export function
export const exportDocument = async (
  content: string,
  title: string,
  options: ExportOptions
): Promise<void> => {
  switch (options.format) {
    case 'txt':
      exportToTxt(content, title, options);
      break;
    case 'docx':
      exportToDocx(content, title, options);
      break;
    case 'pdf':
      await exportToPdf(content, title, options);
      break;
    default:
      throw new Error(`不支持的导出格式: ${options.format}`);
  }
};

// Export multiple documents as ZIP (placeholder for future implementation)
export const exportDocumentsBatch = async (
  documents: Array<{ id: number; title: string; content: string }>,
  format: ExportOptions['format']
): Promise<void> => {
  // For now, download each document sequentially
  // In the future, we could implement ZIP creation using a library like JSZip
  for (const doc of documents) {
    const options: ExportOptions = {
      format,
      fontSize: 12,
      lineHeight: 1.5,
      fontFamily: 'SimSun',
      margins: 'normal',
    };
    await exportDocument(doc.content, doc.title, options);
    // Small delay between downloads
    await new Promise(resolve => setTimeout(resolve, 500));
  }
};

export default exportDocument;
