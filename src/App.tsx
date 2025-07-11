import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { generateClient, SelectionSet } from "aws-amplify/data";
import {
  Button,
  Stack,
  Paper,
  TextField,
  Typography,
  Checkbox,
  IconButton
} from "@mui/material";
import { styled } from '@mui/material/styles';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';

type Todo = Schema["Todo"]["type"];

const client = generateClient<Schema>();

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: '#fff',
  padding: theme.spacing(1.5),
  color: (theme.vars ?? theme).palette.text.secondary,
  ...theme.applyStyles('dark', {
    backgroundColor: '#1A2027',
  }),
}));

// 👇 子タスクを読み込むための定義
const selectionSet = ["id", "content", "isDone", "deadline", "subtasks.*"] as const;

function App() {
  const { user, signOut } = useAuthenticator();
  // 親タスクのみを保持するState
  const [parentTodos, setParentTodos] = useState<Array<Todo>>([]);

  // 新規親タスク用のState
  const [content, setContent] = useState("");
  const [deadline, setDeadline] = useState("");

// App.tsx の中のこの部分を差し替えてください

  useEffect(() => {
    // 👇 全てのタスクを監視するように変更します
    const sub = client.models.Todo.observeQuery().subscribe({
      next: ({ items }) => {
        // --- ここから親子関係を組み立てる処理 ---
        const todoMap = new Map();
        const rootTodos = [];

        // 1. 全てのタスクをMapに登録し、subtasks配列を初期化
        items.forEach(item => {
            todoMap.set(item.id, { ...item, subtasks: [] });
        });

        // 2. 再度全てのタスクをループし、親子関係をリンクさせる
        items.forEach(item => {
            // もし親IDがあれば、親のsubtasksに自分を追加する
            if (item.parentTodoId && todoMap.has(item.parentTodoId)) {
                const parent = todoMap.get(item.parentTodoId);
                parent.subtasks.push(todoMap.get(item.id));
            } 
            // もし親IDがなければ、それは親タスクなのでrootTodosに追加
            else if (!item.parentTodoId) {
                rootTodos.push(todoMap.get(item.id));
            }
        });
        
        // 親タスクを作成日時でソート
        const sortedTodos = rootTodos.sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        // 組み立て直したタスクリストをStateにセット
        setParentTodos(sortedTodos);
      },
      error: (error) => console.error("Query error:", error),
    });

    return () => sub.unsubscribe();
  }, []);

  // 親タスクを作成
  const createParentTodo = async () => {
    if (!content) return;
    const deadlineISO = deadline ? new Date(deadline).toISOString() : null;
    await client.models.Todo.create({
      content,
      isDone: false,
      deadline: deadlineISO,
    });
    setContent("");
    setDeadline("");
  }

  // 子タスクを作成
  const createSubtask = async (parentId: string) => {
    const subtaskContent = window.prompt("サブタスクの内容は？");
    if (!subtaskContent) return;
    await client.models.Todo.create({
      content: subtaskContent,
      isDone: false,
      parentTodoId: parentId, // 親のIDを指定
    });
  }

  // タスクの完了状態を更新
  const toggleTodoComplete = async (todo: Todo) => {
    await client.models.Todo.update({
      id: todo.id,
      isDone: !todo.isDone,
    });
  };

  // タスクを削除 (親子関係を考慮)
  const deleteTodo = async (todo: Todo) => {
    // もし子タスクが存在すれば、それらを先にすべて削除する
    if (todo.subtasks && todo.subtasks.length > 0) {
      await Promise.all(
        todo.subtasks.map(subtask => client.models.Todo.delete({ id: subtask.id }))
      );
    }
    // 親タスク自身を削除
    await client.models.Todo.delete({ id: todo.id });
  };


  // タスクを1行レンダリングするコンポーネント
  const TodoItem = ({ todo, indent = 0 }: { todo: Todo, indent?: number }) => (
    <Item style={{ marginLeft: `${indent * 30}px` }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Checkbox
          checked={todo.isDone}
          onChange={() => toggleTodoComplete(todo)}
        />
        <Stack flexGrow={1}>
          <Typography variant="body1" style={{ textDecoration: todo.isDone ? 'line-through' : 'none' }}>
            {todo.content}
          </Typography>
          {todo.deadline && (
            <Typography variant="caption" color="textSecondary">
              期限: {new Date(todo.deadline).toLocaleString('ja-JP')}
            </Typography>
          )}
        </Stack>
        {indent === 0 && ( // 親タスクにのみ「サブタスク追加」ボタンを表示
          <IconButton size="small" title="サブタスクを追加" onClick={() => createSubtask(todo.id)}>
            <AddCircleOutlineIcon />
          </IconButton>
        )}
        <IconButton size="small" title="削除" onClick={() => deleteTodo(todo)}>
          <DeleteIcon />
        </IconButton>
      </Stack>
    </Item>
  );

  return (
    <main style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
      <Typography variant="h4" mt={3} mb={2}>{user?.signInDetails?.loginId}'s todos</Typography>

      <Paper elevation={2} style={{ padding: '16px', marginBottom: '24px' }}>
        <Stack spacing={2}>
          <Typography variant="h6">新しい親タスクを作成</Typography>
          <TextField
            label="内容"
            variant="outlined"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <TextField
            label="期限"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button variant="contained" onClick={createParentTodo}>+ 作成する</Button>
        </Stack>
      </Paper>

      <Typography variant="h5" mb={2}>タスクリスト</Typography>
      <Stack spacing={1}>
        {parentTodos.map((parent) => (
          <div key={parent.id}>
            <TodoItem todo={parent} indent={0} />
            {parent.subtasks?.map((subtask) => (
              <TodoItem key={subtask.id} todo={subtask} indent={1} />
            ))}
          </div>
        ))}
      </Stack>

      <Button title="クリックでログアウト" variant="contained" onClick={signOut} style={{ marginTop: '30px' }}>Sign out</Button>
    </main>
  );
}

export default App;