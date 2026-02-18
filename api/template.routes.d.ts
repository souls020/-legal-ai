import { Request, Response } from 'express';
import { AuthRequest } from '../auth/auth.middleware.js';
export declare function listTemplatesHandler(req: AuthRequest, res: Response): Promise<void>;
export declare function getTemplateHandler(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function toggleFavoriteHandler(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function listDocumentTypesHandler(req: Request, res: Response): Promise<void>;
export declare function listRegulationsHandler(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=template.routes.d.ts.map