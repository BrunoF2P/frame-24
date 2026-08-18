import { SnowflakeService } from './snowflake.service';

describe('SnowflakeService', () => {
  let service: SnowflakeService;

  beforeEach(() => {
    service = new SnowflakeService();
  });

  it('should generate a numeric id string', () => {
    const id = service.generate();

    expect(typeof id).toBe('string');
    expect(id).toMatch(/^\d+$/);
  });

  it('should generate multiple ids with requested count', () => {
    const ids = service.generateBulk(3);

    expect(ids).toHaveLength(3);
    ids.forEach((id) => expect(id).toMatch(/^\d+$/));
  });

  it('should deconstruct generated id', () => {
    const id = service.generate();

    const payload = service.deconstruct(id);

    expect(payload).toBeDefined();
    expect(payload).toHaveProperty('timestamp');
    expect(payload).toHaveProperty('workerId');
    expect(payload).toHaveProperty('increment');
  });

  it('should extract timestamp from generated id', () => {
    const id = service.generate();

    const timestamp = service.timestampFrom(id);

    expect(typeof timestamp).toBe('number');
    expect(timestamp).toBeGreaterThan(0);
  });
});
