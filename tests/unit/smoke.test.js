describe('Smoke Test', () => {
  it('should run basic arithmetic', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle arrays', () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });

  it('should handle objects', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj).toMatchObject({ name: 'test' });
    expect(obj.value).toBe(42);
  });

  it('should handle async operations', async () => {
    const promise = Promise.resolve('success');
    await expect(promise).resolves.toBe('success');
  });

  it('should have access to test utilities', () => {
    expect(global.testUtils).toBeDefined();
    expect(global.testUtils.wait).toBeDefined();
    expect(global.testUtils.expectValidEmail).toBeDefined();
  });
});