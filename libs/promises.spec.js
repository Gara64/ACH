const { runSerially, runInPool } = require('./promises')

describe('promise tools', () => {
  const promiseMaker = timeToResolve => {
    return new Promise(resolve => {
      setTimeout(() => resolve('Hello ' + timeToResolve), timeToResolve)
    })
  }

  it('should be possible to run promises sequentially', async () => {
    const now = Date.now()
    const results = await runSerially([10, 11, 12, 13, 14], promiseMaker)
    expect(Date.now() - now).toBeGreaterThan(60)
    expect(results).toEqual([
      'Hello 10',
      'Hello 11',
      'Hello 12',
      'Hello 13',
      'Hello 14'
    ])
  })

  it('should be possible to run promises in a pool (pool size < number of promises)', async () => {
    const now = Date.now()
    const results = await runInPool(5)([10, 11, 12, 13, 14], promiseMaker)
    expect(Date.now() - now).toBeLessThan(20)
    expect(results).toEqual([
      'Hello 10',
      'Hello 11',
      'Hello 12',
      'Hello 13',
      'Hello 14'
    ])
  })

  it('should be possible to run promises in a pool (pool size > number of promises)', async () => {
    const now = Date.now()
    const results = await runInPool(5)([10, 11, 12, 13, 14, 10], promiseMaker)
    expect(Date.now() - now).toBeGreaterThanOrEqual(20)
    expect(results).toEqual([
      'Hello 10',
      'Hello 11',
      'Hello 12',
      'Hello 13',
      'Hello 14',
      'Hello 10'
    ])
  })
})
