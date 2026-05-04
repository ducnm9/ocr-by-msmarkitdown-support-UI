import { useEffect, useRef, useState, useCallback } from 'react'
import { WebSocketClient, createWebSocketClient } from '../services/websocket'
import type { WSInboundMessage, WSOutboundMessage } from '../types'

interface UseWebSocketReturn {
  isConnected: boolean
  lastMessage: WSOutboundMessage | null
  sendMessage: (message: WSInboundMessage) => void
  connect: () => void
  disconnect: () => void
}

export function useWebSocket(): UseWebSocketReturn {
  const clientRef = useRef<WebSocketClient | null>(null)
  const isConnectedRef = useRef(false)
  const pendingQueue = useRef<WSInboundMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WSOutboundMessage | null>(null)

  useEffect(() => {
    const client = createWebSocketClient()
    clientRef.current = client

    client.onOpen = () => {
      isConnectedRef.current = true
      setIsConnected(true)
      // Flush any messages that were queued before connection was ready
      const queue = pendingQueue.current.splice(0)
      for (const msg of queue) {
        try {
          client.send(msg)
        } catch (err) {
          console.error('Failed to send queued message:', err)
        }
      }
    }

    client.onClose = () => {
      isConnectedRef.current = false
      setIsConnected(false)
    }

    client.onMessage = (msg) => setLastMessage(msg)
    client.onError = (err) => console.error('WebSocket error:', err)

    client.connect()

    return () => {
      client.disconnect()
    }
  }, [])

  const sendMessage = useCallback((message: WSInboundMessage) => {
    if (isConnectedRef.current && clientRef.current?.isConnected) {
      try {
        clientRef.current.send(message)
      } catch (err) {
        console.error('Failed to send message, queuing:', err)
        pendingQueue.current.push(message)
      }
    } else {
      // Queue the message — will be sent when connection opens
      pendingQueue.current.push(message)
    }
  }, [])

  const connect = useCallback(() => {
    clientRef.current?.connect()
  }, [])

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect()
  }, [])

  return { isConnected, lastMessage, sendMessage, connect, disconnect }
}
