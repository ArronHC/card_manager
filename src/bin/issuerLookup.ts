import { Capacitor, CapacitorHttp } from '@capacitor/core'
import type { CardNetwork } from './detect'
import type { CardType } from '../data/types'

const LOOKUP_ORIGIN = 'https://lookup.binlist.net/'
const SUCCESS_TTL = Number.POSITIVE_INFINITY
const NOT_FOUND_TTL = 10 * 60_000
const FAILURE_TTL = 60_000

export interface IssuerLookupTransportResponse {
  status: number
  data: unknown
}

export type IssuerLookupTransport = (
  url: string,
) => Promise<IssuerLookupTransportResponse>

export type IssuerLookupResult =
  | {
      status: 'found'
      iin: string
      bankName: string
      countryName?: string
      network?: CardNetwork
      cardType?: CardType
    }
  | {
      status: 'not-found' | 'rate-limited' | 'unavailable' | 'web-unavailable'
      iin: string
      message: string
    }

interface CacheEntry {
  result: IssuerLookupResult
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const pending = new Map<string, Promise<IssuerLookupResult>>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringField(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function mapNetwork(value: unknown): CardNetwork | undefined {
  const scheme = stringField(value)?.toLowerCase()
  if (scheme === 'visa') return 'visa'
  if (scheme === 'mastercard') return 'mastercard'
  if (scheme === 'amex' || scheme === 'american express') return 'amex'
  if (scheme === 'jcb') return 'jcb'
  if (scheme === 'discover') return 'discover'
  if (scheme === 'unionpay') return 'unionpay'
  return undefined
}

function mapCardType(value: unknown): CardType | undefined {
  const type = stringField(value)?.toLowerCase()
  if (type === 'debit') return 'debit'
  if (type === 'credit') return 'credit'
  return undefined
}

export function issuerLookupUrl(input: string): string | null {
  const iin = input.replace(/\D+/g, '').slice(0, 8)
  return iin.length === 8 ? LOOKUP_ORIGIN + iin : null
}

async function nativeTransport(url: string): Promise<IssuerLookupTransportResponse> {
  const response = await CapacitorHttp.get({
    url,
    headers: { 'Accept-Version': '3' },
    connectTimeout: 5_000,
    readTimeout: 5_000,
    disableRedirects: true,
  })
  return { status: response.status, data: response.data }
}

function parseResponse(iin: string, response: IssuerLookupTransportResponse): IssuerLookupResult {
  if (response.status === 404) {
    return { status: 'not-found', iin, message: '未查到该发卡行，可手动填写' }
  }
  if (response.status === 429) {
    return { status: 'rate-limited', iin, message: '联网识别次数已达上限，可手动填写' }
  }
  if (response.status < 200 || response.status >= 300 || !isRecord(response.data)) {
    return { status: 'unavailable', iin, message: '联网识别暂不可用，可手动填写' }
  }

  const bank = isRecord(response.data.bank) ? response.data.bank : undefined
  const bankName = stringField(bank?.name)
  if (!bankName) {
    return { status: 'not-found', iin, message: '未查到该发卡行，可手动填写' }
  }

  const country = isRecord(response.data.country) ? response.data.country : undefined
  return {
    status: 'found',
    iin,
    bankName,
    countryName: stringField(country?.name),
    network: mapNetwork(response.data.scheme),
    cardType: mapCardType(response.data.type),
  }
}

function ttlFor(result: IssuerLookupResult): number {
  if (result.status === 'found') return SUCCESS_TTL
  if (result.status === 'not-found') return NOT_FOUND_TTL
  return FAILURE_TTL
}

/**
 * 只查询前 8 位 IIN。完整卡号、末四位及任何持卡人资料都不会进入请求。
 */
export async function lookupIssuer(
  input: string,
  transport?: IssuerLookupTransport,
  now: number = Date.now(),
): Promise<IssuerLookupResult> {
  const url = issuerLookupUrl(input)
  const iin = input.replace(/\D+/g, '').slice(0, 8)
  if (!url) {
    return { status: 'unavailable', iin, message: '至少输入 8 位卡号后才能识别发卡行' }
  }

  const hit = cache.get(iin)
  if (hit && hit.expiresAt > now) return hit.result
  const inFlight = pending.get(iin)
  if (inFlight) return inFlight

  if (!transport && !Capacitor.isNativePlatform()) {
    return {
      status: 'web-unavailable',
      iin,
      message: '联网识别仅在 Android App 中可用，可手动填写',
    }
  }

  const request = (async () => {
    try {
      const result = parseResponse(iin, await (transport ?? nativeTransport)(url))
      cache.set(iin, { result, expiresAt: now + ttlFor(result) })
      return result
    } catch {
      const result: IssuerLookupResult = {
        status: 'unavailable',
        iin,
        message: '网络连接失败，可手动填写发卡行',
      }
      cache.set(iin, { result, expiresAt: now + FAILURE_TTL })
      return result
    } finally {
      pending.delete(iin)
    }
  })()

  pending.set(iin, request)
  return request
}

/** 仅供单元测试隔离模块级缓存。 */
export function clearIssuerLookupCache(): void {
  cache.clear()
  pending.clear()
}
