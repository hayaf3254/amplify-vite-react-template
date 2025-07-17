// src/App.tsx
import React, { useMemo, useEffect } from 'react'; // useEffect を追加
import { Authenticator } from "@aws-amplify/ui-react";
import { AIConversation } from '@aws-amplify/ui-react-ai';
import { getAmplifyClient, getAIHooks } from './client';

export default function App() {
  const client = useMemo(() => getAmplifyClient(), []);
  const { useAIConversation } = useMemo(() => getAIHooks(client), [client]);

  const [
    {
      data: { messages },
      isLoading,
    },
    handleSendMessage,
  ] = useAIConversation('chat');

  // --- デバッグコードここから ---
  // isLoading の変化を監視
  useEffect(() => {
    console.log('AIConversation isLoading:', isLoading);
    if (isLoading) {
      console.log('AIConversation: メッセージ送信中または応答待ち...');
    } else {
      console.log('AIConversation: 応答完了またはアイドル状態。');
    }
  }, [isLoading]);

  // messages の変化を監視（新しいメッセージが追加されたか）
  useEffect(() => {
    console.log('AIConversation messages updated:', messages);
  }, [messages]);

  // handleSendMessage のラッパー関数を作成して、呼び出しをログ
  const debugHandleSendMessage = async (message: string) => {
    console.log('AIConversation: メッセージを送信します:', message);
    try {
      // 実際の handleSendMessage を呼び出す
      await handleSendMessage(message);
      console.log('AIConversation: メッセージ送信リクエストが完了しました。');
    } catch (error) {
      console.error('AIConversation: メッセージ送信中にエラーが発生しました:', error);
    }
  };
  // --- デバッグコードここまで ---

  return (
    <Authenticator>
      <AIConversation
        messages={messages}
        isLoading={isLoading}
        // デバッグ用のラッパー関数を使用
        handleSendMessage={debugHandleSendMessage}
      />
    </Authenticator>
  );
}