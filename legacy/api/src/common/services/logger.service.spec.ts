import { Logger as NestLogger } from '@nestjs/common';
import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  let service: LoggerService;
  let nestLogger: NestLogger;

  beforeEach(() => {
    service = new LoggerService();
    nestLogger = (service as unknown as { logger: NestLogger }).logger;
  });

  it('should log message and metadata when metadata is provided', () => {
    const logSpy = jest.spyOn(nestLogger, 'log').mockImplementation();

    service.log('hello', 'TestContext', { companyId: 'c-1' });

    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenNthCalledWith(1, 'hello', 'TestContext');
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      JSON.stringify({ companyId: 'c-1' }, null, 2),
      'TestContext',
    );
  });

  it('should log only message when metadata is not provided', () => {
    const logSpy = jest.spyOn(nestLogger, 'log').mockImplementation();

    service.log('hello', 'TestContext');

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('hello', 'TestContext');
  });

  it('should use empty trace by default on error', () => {
    const errorSpy = jest.spyOn(nestLogger, 'error').mockImplementation();

    service.error('failure', undefined, 'TestContext');

    expect(errorSpy).toHaveBeenCalledWith('failure', '', 'TestContext');
  });

  it('should log debug message and metadata', () => {
    const debugSpy = jest.spyOn(nestLogger, 'debug').mockImplementation();

    service.debug('debug-msg', 'DebugContext', { requestId: 'r-1' });

    expect(debugSpy).toHaveBeenCalledTimes(2);
    expect(debugSpy).toHaveBeenNthCalledWith(1, 'debug-msg', 'DebugContext');
    expect(debugSpy).toHaveBeenNthCalledWith(
      2,
      JSON.stringify({ requestId: 'r-1' }, null, 2),
      'DebugContext',
    );
  });

  it('should call warn and verbose passthrough methods', () => {
    const warnSpy = jest.spyOn(nestLogger, 'warn').mockImplementation();
    const verboseSpy = jest.spyOn(nestLogger, 'verbose').mockImplementation();

    service.warn('warn-msg', 'WarnContext');
    service.verbose('verbose-msg', 'VerboseContext');

    expect(warnSpy).toHaveBeenCalledWith('warn-msg', 'WarnContext');
    expect(verboseSpy).toHaveBeenCalledWith('verbose-msg', 'VerboseContext');
  });
});
