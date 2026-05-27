import axios from 'axios';

export type ChatContextMessage = {
  role: 'assistant' | 'user';
  text: string;
};

export type ChatAction = {
  label: string;
  to: string;
};

export type ChatbotReply = {
  message: string;
  action?: ChatAction;
  intent?: string;
  source?: string;
};

export type ChatbotRequest = {
  message: string;
  isAuthenticated: boolean;
  context: ChatContextMessage[];
};

type ChatbotSocketEnvelope = {
  event?: string;
  requestId?: string;
  payload?: ChatbotRequest;
  message?: string;
};

const chatbotHttp = axios.create({
  baseURL: import.meta.env.VITE_AI_API_URL || '/ai-api',
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const buildChatbotSocketUrl = () => {
  const configured = import.meta.env.VITE_AI_WS_URL as string | undefined;
  if (configured) return configured;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ai-api/ws/chat`;
};

const createRequestId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const askViaSocket = (payload: ChatbotRequest): Promise<ChatbotReply> =>
  new Promise((resolve, reject) => {
    if (typeof WebSocket === 'undefined') {
      reject(new Error('WebSocket is not available'));
      return;
    }

    const requestId = createRequestId();
    const socket = new WebSocket(buildChatbotSocketUrl());
    let connectionTimer: number | undefined;
    let responseTimer: number | undefined;
    let settled = false;

    const cleanup = () => {
      if (connectionTimer) window.clearTimeout(connectionTimer);
      if (responseTimer) window.clearTimeout(responseTimer);
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        socket.close();
      } catch {
        void 0;
      }
      reject(error);
    };

    const startResponseTimer = () => {
      responseTimer = window.setTimeout(() => {
        fail(new Error('Chat socket response timed out'));
      }, 20000);
    };

    connectionTimer = window.setTimeout(() => {
      fail(new Error('Chat socket connection timed out'));
    }, 4000);

    socket.onopen = () => {
      if (settled) return;
      if (connectionTimer) window.clearTimeout(connectionTimer);
      startResponseTimer();
      const envelope: ChatbotSocketEnvelope = {
        event: 'chat:ask',
        requestId,
        payload,
      };
      socket.send(JSON.stringify(envelope));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as ChatbotSocketEnvelope & { payload?: ChatbotReply };
        if (data.requestId && data.requestId !== requestId) {
          return;
        }

        if (data.event === 'chat:error') {
          fail(new Error(data.message || 'Chat socket error'));
          return;
        }

        if (data.event === 'chat:reply' && data.payload) {
          settled = true;
          cleanup();
          socket.close();
          resolve(data.payload);
        }
      } catch (error) {
        fail(error instanceof Error ? error : new Error('Invalid chat socket response'));
      }
    };

    socket.onerror = () => {
      fail(new Error('Chat socket connection failed'));
    };

    socket.onclose = () => {
      if (!settled) {
        fail(new Error('Chat socket closed before response'));
      }
    };
  });

export const chatbotApi = {
  ask: async (payload: ChatbotRequest): Promise<ChatbotReply> => {
    try {
      return await askViaSocket(payload);
    } catch {
      const response = await chatbotHttp.post<ChatbotReply>('/chat', payload);
      return response.data;
    }
  },
};
