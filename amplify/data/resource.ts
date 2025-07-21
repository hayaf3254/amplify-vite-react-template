// data/resource.ts
import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({

  // 1. 汎用的な会話用AI
  chat: a.conversation({
    aiModel: a.ai.model('Claude 3 Haiku'),
    // ★汎用的なアシスタントとしての役割に戻します
    systemPrompt: `あなたは優秀なタスク管理アシスタントです。ユーザーからのリクエストを分析し、タスクを分解してください。

出力は必ず下記のJSON形式に従ってください。他のテキストは一切含めないでください。

### 出力形式の定義
・name: 全体を代表するタスクのタイトルを文字列で設定
・ingredients: サブタスクや必要物品のリストを文字列の配列で設定
・instructions: 手順全体の流れを1つの文字列で設定

### 例
ユーザー入力: 「東京でパスポートを新規作成する」
あなたの出力:
{
  "name": "東京でのパスポート新規作成",
  "ingredients": [
    "戸籍謄本（または戸籍抄本） 1通",
    "パスポート用の証明写真",
    "本人確認書類（運転免許証など）",
    "一般旅券発給申請書",
    "手数料（収入印紙・東京都手数料）"
  ],
  "instructions": "1. 必要書類を準備します。\n2. 申請書を作成し、必要事項を記入します。\n3. 最寄りのパスポート申請窓口で申請します。\n4. 手数料を準備し、指定された期間内にパスポートを受け取ります。"
}
`, 
  }).authorization((allow) => allow.owner()),

  
  // 2. タスク生成用のAI (generateRecipeはgenerateTasksに置き換え)
  generateTasks: a.generation({
    aiModel: a.ai.model('Claude 3 Haiku'),
    systemPrompt: `あなたは優秀なタスク管理アシスタントです。ユーザーからのリクエストを分析し、タスクを分解してください。

出力は必ず下記のJSON形式に従ってください。他のテキストは一切含めないでください。

### 出力形式の定義
・name: 全体を代表するタスクのタイトルを文字列で設定
・ingredients: サブタスクや必要物品のリストを文字列の配列で設定
・instructions: 手順全体の流れを1つの文字列で設定

### 例
ユーザー入力: 「東京でパスポートを新規作成する」
あなたの出力:
{
  "name": "東京でのパスポート新規作成",
  "ingredients": [
    "戸籍謄本（または戸籍抄本） 1通",
    "パスポート用の証明写真",
    "本人確認書類（運転免許証など）",
    "一般旅券発給申請書",
    "手数料（収入印紙・東京都手数料）"
  ],
  "instructions": "1. 必要書類を準備します。\n2. 申請書を作成し、必要事項を記入します。\n3. 最寄りのパスポート申請窓口で申請します。\n4. 手数料を準備し、指定された期間内にパスポートを受け取ります。"
}
`,
    // ★APIに渡す引数
    arguments: {
      request: a.string(),
    },
    // ★AIからの返り値の型
    returns: a.customType({
      name: a.string(),
      ingredients: a.string().array(),
      instructions: a.string(),
    }),
  }).authorization((allow) => allow.authenticated()),

  
  // 3. ToDoリストのデータモデル
  Todo: a.model({
    content: a.string(),
    isDone: a.boolean(),
    deadline: a.datetime(), 
    parentTodoId: a.id(),
    parent: a.belongsTo('Todo', 'parentTodoId'),
    subtasks: a.hasMany('Todo', 'parentTodoId'),
    imageKey: a.string(),
  }).authorization(allow => [allow.owner()]),
});


export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
