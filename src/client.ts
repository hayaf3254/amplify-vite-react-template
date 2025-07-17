// src/client.ts
import { generateClient } from "aws-amplify/api";
import { Schema } from "../amplify/data/resource";
import { createAIHooks } from "@aws-amplify/ui-react-ai";

// クライアントを生成する関数をエクスポート
export const getAmplifyClient = () => {
  return generateClient<Schema>({ authMode: "userPool" });
};

// クライアントに依存するAIフックを作成する関数をエクスポート
export const getAIHooks = (clientInstance: ReturnType<typeof getAmplifyClient>) => {
  return createAIHooks(clientInstance);
};