import { Request, Response } from 'express';
import { AuthRequest } from '../auth/auth.middleware.js';
export declare function getSubscriptionHandler(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function listPlansHandler(_req: Request, res: Response): Promise<void>;
export declare function getUsageHandler(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function changePlanHandler(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=subscription.routes.d.ts.map