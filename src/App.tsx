import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { generateClient } from "aws-amplify/data";
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';
import { Typography } from "@mui/material";

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

    useEffect(() => {
    const sub = client.models.Todo.observeQuery().subscribe({
      next: ({ items }) => {
        setTodos([...items]);
      },
    });

    return () => sub.unsubscribe();
  }, []);

  const createTodo = async () => {
    await client.models.Todo.create({
      content: window.prompt("Todo content?"),
      isDone: false
    })
  }

  async function deleteTodo(id: string) {
    await client.models.Todo.delete({ id })
  }

  return (
    <main>
      <Typography variant="h3" mt={5}>{user?.signInDetails?.loginId}'s todos</Typography>
      <Stack spacing={1}>
      <Button title="新しいtodoを作成" variant="contained" onClick={createTodo}>+ new</Button>
        
        {todos.map((todo) => (
          <Item title="クリックで削除" onClick={() => deleteTodo(todo.id)} key={todo.id}>{todo.content}</Item>
        ))}
      </Stack>
      <div>
        🥳 App successfully hosted. Try creating a new todo.
        <br />
        <a href="https://docs.amplify.aws/react/start/quickstart/#make-frontend-updates">
          Review next step of this tutorial.
        </a>
      </div>
      <Button title="クリックでログアウト" variant="contained" onClick={signOut}>Sign out</Button>
    </main>
  );
}

export default App;
