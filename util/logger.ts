import pinoHttp from 'pino-http';

export const pino = pinoHttp({
  autoLogging: true,
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label: string) => {
      return {
        level: label,
      };
    },
  },
});

export const log = {
  info: (msg: string, details?: object) => pino.logger.info({ details: { ...details } }, `${msg}`),
  error: (msg: string, details?: object) => pino.logger.error({ details: { ...details } }, `${msg}`),
};
