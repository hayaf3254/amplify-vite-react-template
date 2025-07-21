import { useEffect, useState, useRef } from "react";
import type { Schema } from "../amplify/data/resource";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { generateClient } from "aws-amplify/data";
import { uploadData, getUrl, remove } from 'aws-amplify/storage';
import {
  Button, Stack, Paper, TextField, Typography, Checkbox, IconButton, CardMedia,
  Dialog, DialogTitle, DialogContent, DialogActions // カスタムモーダルのためのインポート
} from "@mui/material";
import { styled } from '@mui/material/styles';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import { AIConversation } from '@aws-amplify/ui-react-ai';
import { useAIConversation } from "./client"; // client.ts をインポート

type BaseTodoFromSchema = Omit<Schema["Todo"]["type"], "subtasks" | "parent">;

type Todo = BaseTodoFromSchema & {
  subtasks: Todo[];
  parent?: Todo | null; // 親タスクも処理後のTodo型として表現する場合
};

const client = generateClient<Schema>();

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: '#fff',
  padding: theme.spacing(1.5),
  color: (theme.vars ?? theme).palette.text.secondary,
  ...theme.applyStyles('dark', {
    backgroundColor: '#1A2027',
  }),
}));

// 画像表示用のコンポーネント
const TodoImage = ({ imageKey }: { imageKey: string }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchUrl = async () => {
      if (!imageKey) {
        setImageUrl(null); // imageKey がない場合は表示しない
        return;
      }
      try {
        console.log(`画像URL取得試行 (key): ${imageKey}`);

        // TodoImage コンポーネント内
        const key = `public/${imageKey}`; // "public/" を手動で追加
        const urlResult = await getUrl({
          path: key, // "public/" を含んだフルパスを指定
          options: {
            // accessLevel は削除する
            validateObjectExistence: true,
          }
        });


        setImageUrl(urlResult.url.toString());
        console.log(`画像URL取得成功: ${urlResult.url.toString()}`);
      } catch (error) {
        console.error('画像のURL取得エラー: ', error);
        setImageUrl(null); // エラー時はURLをクリア
      }
    };
    fetchUrl();
  }, [imageKey]);

  if (!imageUrl) {
    return null;
  }

  return <CardMedia component="img" image={imageUrl} alt="todo image" style={{ maxHeight: 200, marginTop: 10, borderRadius: 4 }} />;
};

function App() {
  const { user, signOut } = useAuthenticator();
  // ★★★ 修正点1: useState の初期値をシンプルに ★★★
  const [parentTodos, setParentTodos] = useState<Todo[]>([]);
  const [content, setContent] = useState("");
  const [deadline, setDeadline] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [{data: { messages },isLoading,},handleSendMessage,] = useAIConversation('chat');

  // カスタムモーダルの状態管理
  const [openAlert, setOpenAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [openConfirm, setOpenConfirm] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [openPrompt, setOpenPrompt] = useState(false);
  const [promptMessage, setPromptMessage] = useState("");
  const [promptInput, setPromptInput] = useState("");
  const [promptAction, setPromptAction] = useState<((value: string | null) => void) | null>(null);

  const showAlert = (message: string) => {
    setAlertMessage(message);
    setOpenAlert(true);
  };

  const handleCloseAlert = () => {
    setOpenAlert(false);
    setAlertMessage("");
  };

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => onConfirm);
    setOpenConfirm(true);
  };

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction();
    }
    setOpenConfirm(false);
    setConfirmMessage("");
    setConfirmAction(null);
  };

  const handleCancelConfirm = () => {
    setOpenConfirm(false);
    setConfirmMessage("");
    setConfirmAction(null);
  };

  const showPrompt = (message: string, onComplete: (value: string | null) => void) => {
    setPromptMessage(message);
    setPromptInput(""); // 入力フィールドをクリア
    setPromptAction(() => onComplete);
    setOpenPrompt(true);
  };

  const handlePromptSubmit = () => {
    if (promptAction) {
      promptAction(promptInput);
    }
    setOpenPrompt(false);
    setPromptMessage("");
    setPromptInput("");
    setPromptAction(null);
  };

  const handlePromptCancel = () => {
    if (promptAction) {
      promptAction(null); // キャンセル時はnullを返す
    }
    setOpenPrompt(false);
    setPromptMessage("");
    setPromptInput("");
    setPromptAction(null);
  };

  


  useEffect(() => {
    // ユーザーが認証されていない場合は、クエリを実行しない
    if (!user) {
      console.log("ユーザーが認証されていません。ToDoの取得をスキップします。");
      setParentTodos([]); // ログアウト時はToDoリストをクリア
      return;
    }

    console.log("observeQueryの購読を開始します。");
    const sub = client.models.Todo.observeQuery().subscribe({
      next: ({ items }) => {
        console.log("observeQueryが受け取ったアイテム（生データ）:", items);

        const todoMap = new Map<string, Todo>();
        const rootTodos: Todo[] = [];

        // 全てのアイテムをマップに格納し、サブタスク配列を初期化
        items.forEach(item => {
          // ★★★ 修正点2: Todo 型に明示的にキャスト ★★★
          // item は Schema["Todo"]["type"] 型なので、subtasks は LazyLoader です。
          // ここで新しい Todo 型に変換します。
          todoMap.set(item.id, {
            ...item,
            subtasks: [], // LazyLoader ではなく空の配列で初期化
            parent: null // 親の参照は初期化時はnull。後でツリー構築時に設定する。
          } as Todo);// Todo 型にキャスト
        });

        // 親子関係を構築
        items.forEach(item => {
          if (item.parentTodoId && todoMap.has(item.parentTodoId)) {
            const parent = todoMap.get(item.parentTodoId);
            if (parent) { // 親タスクが存在することを確認
              parent.subtasks.push(todoMap.get(item.id)!);
            }
          } else if (!item.parentTodoId) {
            rootTodos.push(todoMap.get(item.id)!);
          }
        });

        // 親タスクを生成日時でソート
        const sortedTodos = rootTodos.sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        console.log("処理後のルートToDo（親子関係構築済み・ソート済み）:", sortedTodos);
        setParentTodos(sortedTodos);
      },
      error: (error) => console.error("クエリエラー:", error),
    });
    return () => {
      console.log("observeQueryの購読を解除します。");
      sub.unsubscribe();
    };
  }, [user]); // user オブジェクトが変更された時に再実行

  const createParentTodo = async () => {
    console.log("新しいTODOの作成を開始します...");
    if (!content.trim()) { // 空白のみの入力も防ぐ
      console.log("作成中止: 内容が空です。");
      showAlert("タスクの内容を入力してください。"); // ★★★ alert をカスタムモーダルに置き換え済み ★★★
      return;
    }

    if (!user?.userId) {
      console.error("ユーザーIDが取得できません。ログイン状態を確認してください。");
      showAlert("タスクを作成するにはログインが必要です。"); // ★★★ alert をカスタムモーダルに置き換え済み ★★★
      return;
    }

    let imageKey: string | null = null;
    if (imageFile) {
      console.log("画像ファイルが見つかりました。アップロードを試みます:", imageFile.name);
      try {
        const uniqueFileName = `${Date.now()}-${imageFile.name}`;

        const uploadPath = uniqueFileName;
        console.log("アップロードパス（プレフィックスなし）:", uploadPath);

        const key = `public/${uploadPath}`; // "public/" を手動で追加
        await uploadData({
          path: key, // "public/" を含んだフルパスを指定
          data: imageFile,
          // options の accessLevel は削除する
        }).result;

        imageKey = uploadPath;
        console.log("画像のアップロード成功。DBに保存するKey:", imageKey);
      } catch (error) {
        console.error('画像アップロードエラー。画像なしで処理を続けます:', error);
        showAlert("画像のアップロードに失敗しました。タスクは画像なしで作成されます。"); // ★★★ alert をカスタムモーダルに置き換え済み ★★★
      }
    }

    // 期限が空の場合は null に設定
    const deadlineISO = deadline ? new Date(deadline).toISOString() : null;

    const newTodoData = {
      content,
      isDone: false,
      deadline: deadlineISO,
      imageKey: imageKey // アップロードした画像のプレフィックスなしキー
    };

    console.log("このデータでDBに書き込みます:", newTodoData);

    try {
      const result = await client.models.Todo.create(newTodoData);
      console.log("TODO作成成功！", result);
      setContent("");
      setDeadline("");
      setImageFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // ファイル入力フィールドをクリア
      }
    } catch (error) {
      console.error("【重要】TODO作成に失敗しました！:", error);
      showAlert("タスクの作成に失敗しました。開発者コンソールを確認してください。"); // ★★★ alert をカスタムモーダルに置き換え済み ★★★
    }
  }

  const createSubtask = async (parentId: string) => {
    if (!user?.userId) {
      showAlert("サブタスクを作成するにはログインが必要です。"); // ★★★ alert をカスタムモーダルに置き換え済み ★★★
      return;
    }
    // ★★★ window.prompt をカスタムモーダルに置き換え済み ★★★
    showPrompt("サブタスクの内容は？", async (subtaskContent) => {
      if (!subtaskContent || subtaskContent.trim() === "") {
        return;
      }
      try {
        await client.models.Todo.create({
          content: subtaskContent,
          isDone: false,
          parentTodoId: parentId,
        });
        console.log("サブタスク作成成功！");
      } catch (error) {
        console.error("サブタスク作成エラー:", error);
        showAlert("サブタスクの作成に失敗しました。"); // ★★★ alert をカスタムモーダルに置き換え済み ★★★
      }
    });
  }

  const toggleTodoComplete = async (todo: Todo) => {
    if (!user?.userId) {
      showAlert("タスクの完了状態を更新するにはログインが必要です。"); // ★★★ alert をカスタムモーダルに置き換え済み ★★★
      return;
    }
    try {
      await client.models.Todo.update({
        id: todo.id,
        isDone: !todo.isDone,
      });
      console.log(`ToDo ${todo.id} の完了状態をトグルしました。`);
    } catch (error) {
      console.error(`ToDo ${todo.id} の更新エラー:`, error);
      showAlert("タスクの更新に失敗しました。"); // ★★★ alert をカスタムモーダルに置き換え済み ★★★
    }
  };

  const deleteTodo = async (todo: Todo) => {
    if (!user?.userId) {
      showAlert("タスクを削除するにはログインが必要です。"); // ★★★ alert をカスタムモーダルに置き換え済み ★★★
      return;
    }
    // ★★★ window.confirm をカスタムモーダルに置き換え済み ★★★
    showConfirm(`「${todo.content}」を削除しますか？\nサブタスクも全て削除されます。`, async () => {
      try {
        // サブタスクを再帰的に削除
        if (todo.subtasks && todo.subtasks.length > 0) {
          console.log(`ToDo ${todo.id} のサブタスクを削除中...`);
          await Promise.all(
            todo.subtasks.map(subtask => deleteTodo(subtask)) // 再帰呼び出し
          );
        }

        // 画像が存在すればStorageから削除
        if (todo.imageKey) {
          const key = `public/${todo.imageKey}`; // "public/" を手動で追加
          await remove({
            path: key, // "public/" を含んだフルパスを指定
            // options の accessLevel は削除する
          });

          console.log("画像削除成功。");
        }

        // ToDoレコードを削除
        await client.models.Todo.delete({ id: todo.id });
        console.log(`ToDo ${todo.id} をDBから削除しました。`);
      } catch (error) {
        console.error(`ToDo ${todo.id} の削除エラー:`, error);
        showAlert("タスクの削除に失敗しました。"); // ★★★ alert をカスタムモーダルに置き換え済み ★★★
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    } else {
      setImageFile(null); // ファイルが選択されなかった場合
    }
  };

  const TodoItem = ({ todo, indent = 0 }: { todo: Todo, indent?: number }) => {
    // 期限表示のオプション
    const deadlineOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    };

    return (
      <Item style={{ marginLeft: `${indent * 30}px`, marginTop: '8px' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Checkbox checked={!!todo.isDone} onChange={() => toggleTodoComplete(todo)} />
          <Stack flexGrow={1}>
            <Typography variant="body1" style={{ textDecoration: todo.isDone ? 'line-through' : 'none', wordBreak: 'break-word' }}>
              {todo.content}
            </Typography>
            {todo.deadline && (
              <Typography variant="caption" color="textSecondary">
                期限: {new Date(todo.deadline).toLocaleString('ja-JP', deadlineOptions)}
              </Typography>
            )}
          </Stack>
          {indent === 0 && ( // 親タスクにのみサブタスク追加ボタンを表示
            <IconButton size="small" title="サブタスクを追加" onClick={() => createSubtask(todo.id)}>
              <AddCircleOutlineIcon />
            </IconButton>
          )}
          <IconButton size="small" title="削除" onClick={() => deleteTodo(todo)}>
            <DeleteIcon />
          </IconButton>
        </Stack>
        {todo.imageKey && <TodoImage imageKey={todo.imageKey} />}
        {/* サブタスクを再帰的に表示 */}
        {todo.subtasks && todo.subtasks.length > 0 && (
          <Stack pl={2}>
            {todo.subtasks.map((subtask) => (
              <TodoItem key={subtask.id} todo={subtask} indent={indent + 1} />
            ))}
          </Stack>
        )}
      </Item>
    );
  };

  return (
    <main style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
      <Typography variant="h4" mt={3} mb={2}>{user?.signInDetails?.loginId}'s todos</Typography>
       <Typography variant="h4" mt={3} mb={2}>AI アシスタント</Typography>
      <Paper elevation={2} style={{ padding: '16px', marginBottom: '24px' }}>
        <AIConversation
            messages={messages}
            isLoading={isLoading}
            handleSendMessage={handleSendMessage}
        />
      </Paper>
      
      <Typography variant="h4" mt={3} mb={2}>{user?.signInDetails?.loginId}'s todos</Typography>

      <Paper elevation={2} style={{ padding: '16px', marginBottom: '24px' }}>
        <Stack spacing={2}>
          <Typography variant="h6">新しい親タスクを作成</Typography>
          <TextField
            label="内容"
            variant="outlined"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            fullWidth
          />
          <TextField
            label="期限"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <Button component="label" variant="outlined" startIcon={<PhotoCamera />}>
            画像をアップロード
            <input type="file" accept="image/*" hidden onChange={handleFileChange} ref={fileInputRef} />
          </Button>
          {imageFile && <Typography variant="caption">選択中のファイル: {imageFile.name}</Typography>}
          <Button variant="contained" onClick={createParentTodo} fullWidth>+ 作成する</Button>
        </Stack>
      </Paper>

      <Typography variant="h5" mb={2}>タスクリスト</Typography>
      <Stack spacing={0}>
        {parentTodos.length > 0 ? (
          parentTodos.map((parent) => (
            <div key={parent.id}>
              <TodoItem todo={parent} indent={0} />
            </div>
          ))
        ) : (
          <Typography variant="body2" color="textSecondary" sx={{ ml: 2 }}>
            まだタスクがありません。新しいタスクを作成しましょう！
          </Typography>
        )}
      </Stack>

      <Button title="クリックでログアウト" variant="contained" onClick={signOut} style={{ marginTop: '30px' }}>Sign out</Button>

      {/* カスタムアラートモーダル */}
      <Dialog open={openAlert} onClose={handleCloseAlert}>
        <DialogTitle>お知らせ</DialogTitle>
        <DialogContent>
          <Typography>{alertMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAlert}>OK</Button>
        </DialogActions>
      </Dialog>

      {/* カスタム確認モーダル */}
      <Dialog open={openConfirm} onClose={handleCancelConfirm}>
        <DialogTitle>確認</DialogTitle>
        <DialogContent>
          <Typography>{confirmMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelConfirm}>キャンセル</Button>
          <Button onClick={handleConfirm} autoFocus>OK</Button>
        </DialogActions>
      </Dialog>

      {/* カスタムプロンプトモーダル */}
      <Dialog open={openPrompt} onClose={handlePromptCancel}>
        <DialogTitle>入力</DialogTitle>
        <DialogContent>
          <Typography>{promptMessage}</Typography>
          <TextField
            autoFocus
            margin="dense"
            id="prompt-input"
            label="内容"
            type="text"
            fullWidth
            variant="standard"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handlePromptSubmit();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePromptCancel}>キャンセル</Button>
          <Button onClick={handlePromptSubmit}>OK</Button>
        </DialogActions>
      </Dialog>
    </main>
  );
}

export default App;
