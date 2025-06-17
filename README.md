# 認証付きTodoアプリ（Amplify Gen2 × Vite × React）

##デプロイ
https://main.d1ziokfdlg4hpi.amplifyapp.com/

## 🧠 このアプリについて

Amplify Gen2 のQuickstartをベースに、認証機能付きのTodoアプリを構築しました。  
Vite × React によるフロントエンドと、AmplifyのAuth/API機能を使った認証・データ管理を学習することが目的です。

今回は基本的な内容をチュートリアルをなぞる形で構築しています

---

## 🧩 使用技術

| 技術 | 内容 |
|------|------|
| React + Vite | フロントエンド構築。軽量かつ高速な開発環境 |
| Amplify Gen2 | Auth（Cognito）、API、デプロイの構成 |
| react-hook-form | フォーム管理 |
| MUI（Material UI） | UIライブラリ（ボタンやレイアウト構築） |

---

## ✅ 実装済みの機能

- [x] サインイン／サインアウト機能（Cognito）
- [x] ユーザーごとのTodoリストの表示
- [x] 未ログイン時のアクセス制限

---

## 📝 学習目的・得られたこと

- Amplify CLIとローカル開発環境の連携方法
- Viteを使った高速開発の体験（初）
- MUIを使った基本的なコンポーネント構築

---

## ⚠ 補足（注意点）

- 本アプリは主に **学習・検証目的**で作成されたものです。
- コードベースは Amplify のチュートリアルを参照し、学習効率を優先しています。


---
以下、元々入ってた文章

## AWS Amplify React+Vite Starter Template

This repository provides a starter template for creating applications using React+Vite and AWS Amplify, emphasizing easy setup for authentication, API, and database capabilities.

## Overview

This template equips you with a foundational React application integrated with AWS Amplify, streamlined for scalability and performance. It is ideal for developers looking to jumpstart their project with pre-configured AWS services like Cognito, AppSync, and DynamoDB.

## Features

- **Authentication**: Setup with Amazon Cognito for secure user authentication.
- **API**: Ready-to-use GraphQL endpoint with AWS AppSync.
- **Database**: Real-time database powered by Amazon DynamoDB.

## Deploying to AWS

For detailed instructions on deploying your application, refer to the [deployment section](https://docs.amplify.aws/react/start/quickstart/#deploy-a-fullstack-app-to-aws) of our documentation.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
