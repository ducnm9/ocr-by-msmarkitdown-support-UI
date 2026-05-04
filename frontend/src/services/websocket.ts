import type { WSInboundMessage, WSOutboundMessage } from '../types'

export type MessageHandler = (message: WSOutboundMessage) => void
export type StatusHandler = () => void

export class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private retryCount = 0
  private maxRetries = 5
  private retryDelay = 1000 // ms
  private maxRetryDelay = 30000 // ms
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private shouldReconnect = true

  onMessage: MessageHandler | null = null
  onOpen: StatusHandler | null = null
  onClose: StatusHandler | null = null
  onError: ((error: Event) => void) | null = null

  constructor(url: string) {
    this.url = url
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return
    this.shouldReconnect = true
    this._connect()
  }

  disconnect(): void {
    this.shouldReconnect = false
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    this.ws?.close()
    this.ws = null
    this.retryCount = 0
  }

  send(message: WSInboundMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WS] Sending:', message.action)
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('[WS] Cannot send — state:', this.ws?.readyState, '(0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)')
      throw new Error('WebSocket is not connected')
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  private _connect(): void {
    try {
      console.log('[WS] Connecting to', this.url)
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log('[WS] Connected')
        this.retryCount = 0
        this.retryDelay = 1000
        this.onOpen?.()
      }

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data as string) as WSOutboundMessage
          this.onMessage?.(message)
        } catch {
          console.error('[WS] Failed to parse message:', event.data)
        }
      }

      this.ws.onclose = (event) => {
        console.log('[WS] Closed — code:', event.code, 'reason:', event.reason)
        this.onClose?.()
        if (this.shouldReconnect && this.retryCount < this.maxRetries) {
          this.retryCount++
          const delay = Math.min(this.retryDelay * Math.pow(2, this.retryCount - 1), this.maxRetryDelay)
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.retryCount})`)
          this.retryTimer = setTimeout(() => this._connect(), delay)
        }
      }

      this.ws.onerror = (error: Event) => {
        console.error('[WS] Error:', error)
        this.onError?.(error)
      }
    } catch (err) {
      console.error('[WS] Failed to create WebSocket:', err)
    }
  }
}

// Factory function for creating a WebSocket client with the correct URL
export function createWebSocketClient(): WebSocketClient {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  const url = `${protocol}//${host}/ws/test`
  return new WebSocketClient(url)
}
