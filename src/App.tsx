import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { generateClient } from "aws-amplify/data";
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';
import { TextField, Typography } from "@mui/material";

const client = generateClient<Schema>();
const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(1),
  cursor: 'pointer',
  textAlign: 'center',
  color: (theme.vars ?? theme).palette.text.secondary,
  ...theme.applyStyles('dark', {
    backgroundColor: '#1A2027',
  }),
}));



function App() {
  const { user, signOut } = useAuthenticator();
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);

  const [content, setContent] = useState("");
  const [deadline, setDeadline] = useState("");

    useEffect(() => {
    const sub = client.models.Todo.observeQuery().subscribe({
      next: ({ items }) => {
        const sortedTodos = [...items].sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setTodos(sortedTodos);
      },
    });

    return () => sub.unsubscribe();
  }, []);

  const createTodo = async () => {
    // contentが空の場合は何もしない
    if (!content) {
      alert("内容を入力してください。");
      return;
    }
    try {
      // 👇 この一行を追加します
      // 期限が入力されていれば、バックエンドが要求する正しい形式(ISO文字列)に変換します
      const deadlineISO = deadline ? new Date(deadline).toISOString() : null;

      await client.models.Todo.create({
        content: content,
        isDone: false,
        // 👇 作成時に、上で変換した値を渡します
        deadline: deadlineISO,
      });

      // 入力欄をクリア
      setContent("");
      setDeadline("");
    } catch (error) {
      console.error("TODOの作成エラー:", error);
      alert("TODOの作成に失敗しました。");
    }
  }

  async function deleteTodo(id: string) {
    await client.models.Todo.delete({ id })
  }

  return (
        <main style={{ padding: '20px' }}>
      <Typography variant="h4" mt={3} mb={2}>{user?.signInDetails?.loginId}'s todos</Typography>

      {/* 👇 STEP 2: 新規TODO作成フォーム */}
      <Paper elevation={2} style={{ padding: '16px', marginBottom: '24px' }}>
        <Stack spacing={2}>
          <Typography variant="h6">新しいTodoを作成</Typography>
          <TextField
            label="内容"
            variant="outlined"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <TextField
            label="期限"
            type="datetime-local" // 日付と時刻を入力できるタイプ
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            InputLabelProps={{
              shrink: true, // ラベルが常に表示されるように
            }}
          />
          <Button variant="contained" onClick={createTodo}>+ 作成する</Button>
        </Stack>
      </Paper>


      <Stack spacing={1}>
        {/* 👇 STEP 3: 一覧表示を更新 */}
        {todos.map((todo) => (
          <Item title="クリックで削除" onClick={() => deleteTodo(todo.id)} key={todo.id}>
            <Typography variant="body1" style={{ textDecoration: todo.isDone ? 'line-through' : 'none' }}>
              {todo.content}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {/* todo.deadlineが存在すれば、見やすい形式で表示 */}
              期限: {todo.deadline ? new Date(todo.deadline).toLocaleString('ja-JP') : 'なし'}
            </Typography>
          </Item>
        ))}
      </Stack>

      <Button title="クリックでログアウト" variant="contained" onClick={signOut} style={{ marginTop: '30px' }}>Sign out</Button>
    </main>
  );
}

export default App;
