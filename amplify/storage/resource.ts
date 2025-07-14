// amplify/storage/resource.ts
import { defineStorage } from '@aws-amplify/backend';


export const storage = defineStorage({
  name: 'amplifyTeamDrive', // この名前は今のままでOK
  access: (allow) => ({
    // 👇 認証されたユーザーが自分専用の private フォルダを読み書き削除できるように設定
    //'private/{cognitoIdentityId}/*': [
      //allow.entity('identity').to(['read', 'write', 'delete']),
    // ],
    'public/*': [
      allow.authenticated.to(['read', 'write', 'delete'])
    ],
  })
});