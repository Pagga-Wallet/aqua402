import { useEffect, useRef, useState } from 'react'

interface WebSocketMessage {
  type: string
  payload: any
}

export function useWebSocket(url: string, topics: string[] = []) {
  const [messages, setMessages] = useState<WebSocketMessage[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      // Subscribe to topics
      topics.forEach((topic) => {
        ws.send(JSON.stringify({ action: 'subscribe', topic }))
      })
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        setMessages((prev) => [...prev, message])
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.onclose = () => {
      setConnected(false)
    }

    return () => {
      topics.forEach((topic) => {
        ws.send(JSON.stringify({ action: 'unsubscribe', topic }))
      })
      ws.close()
    }
  }, [url, JSON.stringify(topics)])

  const send = (message: any) => {
    if (wsRef.current && connected) {
      wsRef.current.send(JSON.stringify(message))
    }
  }

  return { messages, connected, send }
}

