import { Response } from 'express';
import { AuthRequest } from '../auth/auth.middleware.js';
export declare function exportHandler(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function batchExportHandler(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getExportOptionsHandler(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=export.routes.d.ts.map