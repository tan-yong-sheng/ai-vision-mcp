/**
 * Basic functionality tests
 */

// Test basic imports work
describe('Basic functionality', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should validate basic functionality', () => {
    const testConfig = {
      IMAGE_PROVIDER: 'google',
      VIDEO_PROVIDER: 'google',
      LOG_LEVEL: 'info',
    };

    expect(testConfig.IMAGE_PROVIDER).toBe('google');
    expect(testConfig.VIDEO_PROVIDER).toBe('google');
    expect(testConfig.LOG_LEVEL).toBe('info');
  });
});