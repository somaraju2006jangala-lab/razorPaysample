import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { PaymentPersistenceService } from '../services/paymentPersistenceService.js';
export class AdminController {
    /**
     * POST /api/admin/login
     * Authenticates administrator and returns JWT token
     */
    static async login(req, res, next) {
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                res.status(400).json({ success: false, error: 'Username and password are required' });
                return;
            }
            if (username !== config.admin.username || password !== config.admin.password) {
                res.status(401).json({ success: false, error: 'Invalid admin credentials' });
                return;
            }
            const token = jwt.sign({ username, role: 'admin' }, config.admin.secretKey, { expiresIn: '8h' });
            PaymentPersistenceService.logAdminAction(username, 'ADMIN_LOGIN', 'Administrator logged into Payment Portal', req.ip);
            res.status(200).json({
                success: true,
                message: 'Authentication successful',
                data: {
                    token,
                    user: {
                        username,
                        role: 'admin',
                    },
                    expires_in: '8h',
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/admin/stats
     * Aggregates payment statistics for the admin dashboard
     */
    static async getStats(req, res, next) {
        try {
            const metrics = PaymentPersistenceService.getDashboardMetrics();
            res.status(200).json({
                success: true,
                data: metrics,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/admin/webhooks
     * Retrieves recent webhook events
     */
    static async getWebhookLogs(req, res, next) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const logs = PaymentPersistenceService.listWebhookLogs(limit);
            res.status(200).json({
                success: true,
                data: logs,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/admin/audit-logs
     * Retrieves administrator actions audit log
     */
    static async getAuditLogs(req, res, next) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const logs = PaymentPersistenceService.listAuditLogs(limit);
            res.status(200).json({
                success: true,
                data: logs,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
