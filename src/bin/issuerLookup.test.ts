import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearIssuerLookupCache,
  issuerLookupUrl,
  lookupIssuer,
  type IssuerLookupTransport,
} from './issuerLookup'

beforeEach(() => clearIssuerLookupCache())

describe('境外发卡行联网识别', () => {
  it('请求地址永远只包含前 8 位 IIN', () => {
    expect(issuerLookupUrl('4571 7360 1234 5678')).toBe(
      'https://lookup.binlist.net/45717360',
    )
    expect(issuerLookupUrl('4571736')).toBeNull()
  })

  it('映射银行、国家、卡组织和卡类型', async () => {
    const transport: IssuerLookupTransport = vi.fn(async () => ({
      status: 200,
      data: {
        scheme: 'visa',
        type: 'debit',
        country: { name: 'Denmark' },
        bank: { name: 'Jyske Bank A/S' },
      },
    }))

    await expect(lookupIssuer('4571736012345678', transport)).resolves.toEqual({
      status: 'found',
      iin: '45717360',
      bankName: 'Jyske Bank A/S',
      countryName: 'Denmark',
      network: 'visa',
      cardType: 'debit',
    })
    expect(transport).toHaveBeenCalledWith('https://lookup.binlist.net/45717360')
  })

  it('同一 IIN 的并发与后续请求复用内存缓存', async () => {
    const transport = vi.fn(async () => ({
      status: 200,
      data: { scheme: 'mastercard', bank: { name: 'Example Bank' } },
    }))
    const [a, b] = await Promise.all([
      lookupIssuer('5555555511112222', transport),
      lookupIssuer('5555555599990000', transport),
    ])
    const c = await lookupIssuer('5555555500000000', transport)

    expect(a).toEqual(b)
    expect(c).toEqual(a)
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it.each([
    [404, 'not-found'],
    [429, 'rate-limited'],
    [500, 'unavailable'],
  ] as const)('HTTP %s 可降级为 %s', async (status, expected) => {
    const result = await lookupIssuer('4111111100000000', async () => ({
      status,
      data: {},
    }))
    expect(result.status).toBe(expected)
  })

  it('网络异常不抛出，不阻止用户手工填写', async () => {
    const result = await lookupIssuer('4111111100000000', async () => {
      throw new Error('offline')
    })
    expect(result.status).toBe('unavailable')
    expect('message' in result && result.message).toContain('手动填写')
  })
})
