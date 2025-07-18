/**
 * Logging Service for Teams Bot
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 */

import winston from 'winston';

export class LoggingService {
    private static instance: LoggingService;
    private logger: winston.Logger;

    private constructor() {
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
                winston.format.json()
            ),
            defaultMeta: {
                service: 'anf-aiops-teams-bot',
                author: 'Dwiref Sharma',
                version: '1.0.0'
            },
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                })
            ]
        });

        // Add file transport for production
        if (process.env.NODE_ENV === 'production') {
            this.logger.add(new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error',
                format: winston.format.json()
            }));

            this.logger.add(new winston.transports.File({
                filename: 'logs/combined.log',
                format: winston.format.json()
            }));
        }
    }

    public static getInstance(): LoggingService {
        if (!LoggingService.instance) {
            LoggingService.instance = new LoggingService();
        }
        return LoggingService.instance;
    }

    public debug(message: string, meta?: any): void {
        this.logger.debug(message, meta);
    }

    public info(message: string, meta?: any): void {
        this.logger.info(message, meta);
    }

    public warn(message: string, meta?: any): void {
        this.logger.warn(message, meta);
    }

    public error(message: string, meta?: any): void {
        this.logger.error(message, meta);
    }

    public getLogger(): winston.Logger {
        return this.logger;
    }
}