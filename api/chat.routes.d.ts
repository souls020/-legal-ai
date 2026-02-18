import { Response } from 'express';
import { AuthRequest } from '../auth/auth.middleware.js';
export declare function chatMessageHandler(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function chatMessageStreamHandler(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=chat.routes.d.ts.map