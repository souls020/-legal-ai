export type ExportFormat = 'docx' | 'pdf' | 'txt';
export interface ExportOptions {
    format: ExportFormat;
    includeHeader?: boolean;
    includeFooter?: boolean;
    pageNumbers?: boolean;
    fontFamily?: string;
    fontSize?: number;
    lineHeight?: number;
}
export declare function exportDocument(documentId: number, userId: number, options: ExportOptions): Promise<{
    success: boolean;
    filename?: string;
    content?: Buffer;
    mimeType?: string;
    error?: string;
}>;
export declare function batchExport(documentIds: number[], userId: number, format: ExportFormat): Promise<{
    success: boolean;
    documents: Array<{
        id: number;
        success: boolean;
        filename?: string;
        error?: string;
    }>;
    error?: string;
}>;
export declare function getExportOptions(documentId: number, userId: number): Promise<{
    availableFormats: ExportFormat[];
    filename: string;
} | null>;
//# sourceMappingURL=export.service.d.ts.map