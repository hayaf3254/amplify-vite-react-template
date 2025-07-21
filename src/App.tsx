import { useEffect, useState, useRef } from "react";
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../amplify/data/resource'
import { useAuthenticator } from '@aws-amplify/ui-react';
import { uploadData, getUrl, remove } from 'aws-amplify/storage';
import {
  Button, Stack, Paper, TextField, Typography, Checkbox, IconButton, CardMedia,
  Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import { styled } from '@mui/material/styles';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import { AIConversation } from '@aws-amplify/ui-react-ai';
import { useAIConversation } from "./client"; // This path might need adjustment based on the actual project structureath might need adjustment based on the actual project structure

 // Define the Todo type, extending from the schema but including nested subtasks
 type BaseTodoFromSchema = Omit<Schema["Todo"]["type"], "subtasks" | "parent">;

 type Todo = BaseTodoFromSchema & {
   subtasks: Todo[];
   parent?: Todo | null;
 };

 // Initialize the Amplify Data client
 const client = generateClient<Schema>();

 // Styled component for consistent item styling
 const Item = styled(Paper)(({ theme }) => ({
   backgroundColor: '#fff',
   padding: theme.spacing(1.5),
   color: (theme.vars ?? theme).palette.text.secondary,
   ...theme.applyStyles('dark', {
     backgroundColor: '#1A2027',
   }),
 }));

 // Component to display a Todo item's image
 const TodoImage = ({ imageKey }: { imageKey: string }) => {
   const [imageUrl, setImageUrl] = useState<string | null>(null);

   useEffect(() => {
     const fetchUrl = async () => {
       if (!imageKey) {
         setImageUrl(null);
         return;
       }
       try {
         // Construct the public path for the image
         const key = `public/${imageKey}`;
         const urlResult = await getUrl({
           path: key,
           options: {
             validateObjectExistence: true, // Validate if the object exists before getting the URL
           }
         });
         setImageUrl(urlResult.url.toString());
       } catch (error) {
         console.error('画像のURL取得エラー: ', error); // Error fetching image URL
         setImageUrl(null);
       }
     };
     fetchUrl();
   }, [imageKey]); // Re-fetch when imageKey changes

   if (!imageUrl) {
     return null; // Don't render if no image URL
   }

   // Render the image with Material-UI CardMedia
   return <CardMedia component="img" image={imageUrl} alt="todo image" style={{ maxHeight: 200, marginTop: 10, borderRadius: 4 }} />;
 };

 function App() {
   // Authenticator hook for user management
   const { user, signOut } = useAuthenticator();
   // State for parent (root) todos
   const [parentTodos, setParentTodos] = useState<Todo[]>([]
);
   // State for new todo content
   const [content, setContent] = useState("");
   // State for new todo deadline
   const [deadline, setDeadline] = useState("");
   // State for image file to be uploaded
   const [imageFile, setImageFile] = useState<File | null>(null);
   // Ref for file input element
   const fileInputRef = useRef<HTMLInputElement>(null);

   // AI Conversation hook for chat functionality
   const [{ data: { messages }, isLoading, }, handleSendMessage,] = useAIConversation('chat');

   // State for custom alert dialog
   const [openAlert, setOpenAlert] = useState(false);
   const [alertMessage, setAlertMessage] = useState("");
   // State for custom confirmation dialog
   const [openConfirm, setOpenConfirm] = useState(false);
   const [confirmMessage, setConfirmMessage] = useState("");
   const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
   // State for custom prompt dialog
   const [openPrompt, setOpenPrompt] = useState(false);
   const [promptMessage, setPromptMessage] = useState("");
   const [promptInput, setPromptInput] = useState("");
   const [promptAction, setPromptAction] = useState<((value: string | null) => void) | null>(null);

   // Function to show an alert dialog
   const showAlert = (message: string) => {
     setAlertMessage(message);
     setOpenAlert(true);
   };

   // Function to close the alert dialog
   const handleCloseAlert = () => {
     setOpenAlert(false);
     setAlertMessage("");
   };

   // Function to show a confirmation dialog
   const showConfirm = (message: string, onConfirm: () => void) => {
     setConfirmMessage(message);
     setConfirmAction(() => onConfirm); // Store the action to be executed on confirmation
     setOpenConfirm(true);
   };

   // Function to handle confirmation (executes the stored action)
   const handleConfirm = () => {
     if (confirmAction) {
       confirmAction();
     }
     setOpenConfirm(false);
     setConfirmMessage("");
     setConfirmAction(null);
   };

   // Function to handle cancellation of confirmation
   const handleCancelConfirm = () => {
     setOpenConfirm(false);
     setConfirmMessage("");
     setConfirmAction(null);
   };

   // Function to show a prompt dialog
   const showPrompt = (message: string, onComplete: (value: string | null) => void) => {
     setPromptMessage(message);
     setPromptInput(""); // Clear previous input
     setPromptAction(() => onComplete); // Store the callback for prompt completion
     setOpenPrompt(true);
   };

   // Function to handle prompt submission
   const handlePromptSubmit = () => {
     if (promptAction) {
       promptAction(promptInput); // Execute callback with the input value
     }
     setOpenPrompt(false);
     setPromptMessage("");
     setPromptInput("");
     setPromptAction(null);
   };

   // Function to handle prompt cancellation
   const handlePromptCancel = () => {
     if (promptAction) {
       promptAction(null); // Execute callback with null on cancellation
     }
     setOpenPrompt(false);
     setPromptMessage("");
     setPromptInput("");
     setPromptAction(null);
   };

   // Function to create a todo from AI-generated text
   const createTodoFromAI = async (taskContent: string) => {
     if (!user?.userId) {
       showAlert("タスクを作成するにはログインが必要です。"); // Login required to create task
       return;
     }
     try {
       await client.models.Todo.create({
         content: taskContent,
         isDone: false,
         deadline: null, // AI tasks typically don't have a deadline initially
         imageKey: null, // AI tasks typically don't have an image initially
       });
       console.log("AIからのタスクが正常に作成されました:", taskContent); // AI task created successfully
     } catch (error) {
       console.error("AIからのタスク作成エラー:", error); // Error creating AI task
       showAlert("AIからのタスクの作成に失敗しました。"); // Failed to create AI task
     }
   };

   // Effect hook to process AI responses and save tasks to DB
   useEffect(() => {
     // Do nothing if user is not logged in or no messages
     if (!user || messages.length === 0) {
       return;
     }

     const lastMessage = messages[messages.length - 1];

     // Check if the last message is from the AI assistant and not loading
     if (lastMessage && lastMessage.role === 'assistant' && !isLoading) {
       const content = lastMessage.content;
       console.log("【AIからの生の応答データ】:", content); // Raw response data from AI

       let aiResponseText = '';
       // Determine the format of the response (string or array of objects) and extract text
       if (typeof content === 'string') {
         aiResponseText = content;
       } else if (Array.isArray(content)) {
         // If content is an array, concatenate text parts into a single string
         aiResponseText = content
           .map(item => (typeof item === 'string' ? item : (item as any).text || ''))
           .join('');
       }

       console.log("【処理用に結合したテキスト】:", aiResponseText); // Combined text for processing

       // If no text, end processing
       if (!aiResponseText) {
         console.log("処理対象のテキストが見つかりませんでした。"); // No text found for processing
         return;
       }

       // Extract potential tasks from the text (lines starting with number., -, or *)
       const potentialTasks = aiResponseText.split('\n').filter(line => {
         const trimmedLine = line.trim();
         return trimmedLine.length > 2 && /^(?:\d+\.|-|\*)\s/.test(trimmedLine);
       });

       console.log("【抽出されたタスク候補】:", potentialTasks); // Extracted task candidates

       // If task candidates exist, show a confirmation modal to the user
       if (potentialTasks.length > 0) {
         showConfirm(
           `AIが ${potentialTasks.length} 件のタスクを提案しました。リストに追加しますか？`, // AI proposed X tasks. Add to list?
           () => {
             potentialTasks.forEach(taskText => {
               // Clean up the task text (remove leading numbers/bullets)
               const cleanTaskText = taskText.replace(/^(?:\d+\.|-|\*)\s/, '').trim();
               if (cleanTaskText) {
                 createTodoFromAI(cleanTaskText); // Create todo for each clean task
               }
             });
           }
         );
       } else {
         console.log("テキスト内にタスク形式の行が見つかりませんでした。"); // No task-formatted lines found in text
       }
     }
   }, [messages, isLoading, user]); // Dependencies for useEffect

   // Effect hook to subscribe to todo list changes from Amplify Data
   useEffect(() => {
     if (!user) {
       setParentTodos([]); // Clear todos if not logged in
       return;
     }

     // Subscribe to real-time updates for Todo items
     const sub = client.models.Todo.observeQuery().subscribe({
       next: ({ items }) => {
         const todoMap = new Map<string, Todo>();
         const rootTodos: Todo[] = [];

         // Populate the map with all todos and initialize subtasks array
         items.forEach(item => {
           todoMap.set(item.id, {
             ...item,
             subtasks: [],
             parent: null
           } as Todo);
         });

         // Build the parent-child relationship
         items.forEach(item => {
           if (item.parentTodoId && todoMap.has(item.parentTodoId)) {
             const parent = todoMap.get(item.parentTodoId);
             if (parent) {
               parent.subtasks.push(todoMap.get(item.id)!);
             }
           } else if (!item.parentTodoId) {
             rootTodos.push(todoMap.get(item.id)!); // Add to root if no parent
           }
         });

         // Sort root todos by creation date
         const sortedTodos = rootTodos.sort((a, b) =>
           new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
         );
         setParentTodos(sortedTodos);
       },
       error: (error) => console.error("クエリエラー:", error), // Query error
     });
     // Unsubscribe on component unmount
     return () => {
       sub.unsubscribe();
     };
   }, [user]); // Re-run when user changes

   // Function to create a new parent todo
   const createParentTodo = async () => {
     if (!content.trim()) {
       showAlert("タスクの内容を入力してください。"); // Please enter task content.
       return;
     }

     if (!user?.userId) {
       showAlert("タスクを作成するにはログインが必要です。"); // Login required to create task.
       return;
     }

     let imageKey: string | null = null;
     if (imageFile) {
       try {
         // Generate a unique file name for the image
         const uniqueFileName = `${Date.now()}-${imageFile.name}`;
         const uploadPath = uniqueFileName;
         const key = `public/${uploadPath}`; // Path in S3
         await uploadData({
           path: key,
           data: imageFile,
         }).result;
         imageKey = uploadPath;
       } catch (error) {
         console.error('画像アップロードエラー:', error); // Image upload error
         showAlert("画像のアップロードに失敗しました。"); // Failed to upload image.
       }
     }

     // Format deadline to ISO string if it exists
     const deadlineISO = deadline ? new Date(deadline).toISOString() : null;

     const newTodoData = {
       content,
       isDone: false,
       deadline: deadlineISO,
       imageKey: imageKey
     };

     try {
       await client.models.Todo.create(newTodoData); // Create the todo item
       // Clear form fields after successful creation
       setContent("");
       setDeadline("");
       setImageFile(null);
       if (fileInputRef.current) {
         fileInputRef.current.value = ""; // Clear file input
       }
     } catch (error) {
       console.error("TODO作成に失敗しました:", error); // Failed to create TODO
       showAlert("タスクの作成に失敗しました。"); // Failed to create task.
     }
   }

   // Function to create a subtask for a given parent todo
   const createSubtask = async (parentId: string) => {
     if (!user?.userId) {
       showAlert("サブタスクを作成するにはログインが必要です。"); // Login required to create subtask.
       return;
     }
     showPrompt("サブタスクの内容は？", async (subtaskContent) => { // What is the subtask content?
       if (!subtaskContent || subtaskContent.trim() === "") {
         return; // Do nothing if content is empty
       }
       try {
         await client.models.Todo.create({
           content: subtaskContent,
           isDone: false,
           parentTodoId: parentId, // Link to parent todo
         });
       } catch (error) {
         console.error("サブタスク作成エラー:", error); // Subtask creation error
         showAlert("サブタスクの作成に失敗しました。"); // Failed to create subtask.
       }
     });
   }

   // Function to toggle the completion status of a todo
   const toggleTodoComplete = async (todo: Todo) => {
     if (!user?.userId) {
       showAlert("タスクの完了状態を更新するにはログインが必要です。"); // Login required to update task status.
       return;
     }
     try {
       await client.models.Todo.update({
         id: todo.id,
         isDone: !todo.isDone, // Toggle the boolean value
       });
     } catch (error) {
       console.error(`ToDo ${todo.id} の更新エラー:`, error); // Error updating ToDo
       showAlert("タスクの更新に失敗しました。"); // Failed to update task.
     }
   };

   // Function to delete a todo (and its subtasks recursively)
   const deleteTodo = async (todo: Todo) => {
     if (!user?.userId) {
       showAlert("タスクを削除するにはログインが必要です。"); // Login required to delete task.
       return;
     }
     showConfirm(`「${todo.content}」を削除しますか？\nサブタスクも全て削除されます。`, async () => { // Delete "X"? All subtasks will also be deleted.
       try {
         // Recursively delete subtasks first
         if (todo.subtasks && todo.subtasks.length > 0) {
           await Promise.all(
             todo.subtasks.map(subtask => deleteTodo(subtask))
           );
         }

         // If there's an image, remove it from storage
         if (todo.imageKey) {
           const key = `public/${todo.imageKey}`;
           await remove({
             path: key,
           });
         }

         await client.models.Todo.delete({ id: todo.id }); // Delete the todo itself
       } catch (error) {
         console.error(`ToDo ${todo.id} の削除エラー:`, error); // Error deleting ToDo
         showAlert("タスクの削除に失敗しました。"); // Failed to delete task.
       }
     });
   };

   // Handler for file input change
   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files[0]) {
       setImageFile(e.target.files[0]);
     } else {
       setImageFile(null);
     }
   };

   // Recursive component to render individual todo items and their subtasks
   const TodoItem = ({ todo, indent = 0 }: { todo: Todo, indent?: number }) => {
     // Options for formatting deadline date
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
                 期限: {new Date(todo.deadline).toLocaleString('ja-JP', deadlineOptions)} {/* Deadline */}
               </Typography>
             )}
           </Stack>
           {indent === 0 && ( // Only allow adding subtasks to parent todos (indent 0)
             <IconButton size="small" title="サブタスクを追加" onClick={() => createSubtask(todo.id)}> {/* Add subtask */}
               <AddCircleOutlineIcon />
             </IconButton>
           )}
           <IconButton size="small" title="削除" onClick={() => deleteTodo(todo)}> {/* Delete */}
             <DeleteIcon />
           </IconButton>
         </Stack>
         {todo.imageKey && <TodoImage imageKey={todo.imageKey} />} {/* Display image if available */}
         {todo.subtasks && todo.subtasks.length > 0 && (
           <Stack pl={2}>
             {todo.subtasks.map((subtask) => (
               <TodoItem key={subtask.id} todo={subtask} indent={indent + 1} /> // Recursively render subtasks
             ))}
           </Stack>
         )}
       </Item>
     );
   };

   return (
     <main style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
       <Typography variant="h4" mt={3} mb={2}>{user?.signInDetails?.loginId}'s todos</Typography> {/* User's todos */}
       <Typography variant="h4" mt={3} mb={2}>AI アシスタント</Typography> {/* AI Assistant */}
       <Paper elevation={2} style={{ padding: '16px', marginBottom: '24px' }}>
         <AIConversation
           messages={messages}
           isLoading={isLoading}
           handleSendMessage={handleSendMessage}
         />
       </Paper>

       <Typography variant="h4" mt={3} mb={2}>タスク管理</Typography> {/* Task Management */}

       <Paper elevation={2} style={{ padding: '16px', marginBottom: '24px' }}>
         <Stack spacing={2}>
           <Typography variant="h6">新しい親タスクを作成</Typography> {/* Create new parent task */}
           <TextField
             label="内容" // Content
             variant="outlined"
             value={content}
             onChange={(e) => setContent(e.target.value)}
             fullWidth
           />
           <TextField
             label="期限" // Deadline
             type="datetime-local"
             value={deadline}
             onChange={(e) => setDeadline(e.target.value)}
             InputLabelProps={{ shrink: true }}
             fullWidth
           />
           <Button component="label" variant="outlined" startIcon={<PhotoCamera />}>
             画像をアップロード {/* Upload image */}
             <input type="file" accept="image/*" hidden onChange={handleFileChange} ref={fileInputRef} />
           </Button>
           {imageFile && <Typography variant="caption">選択中のファイル: {imageFile.name}</Typography>} {/* Selected file */}
           <Button variant="contained" onClick={createParentTodo} fullWidth>+ 作成する</Button> {/* Create */}
         </Stack>
       </Paper>

       <Typography variant="h5" mb={2}>タスクリスト</Typography> {/* Task List */}
       <Stack spacing={0}>
         {parentTodos.length > 0 ? (
           parentTodos.map((parent) => (
             <div key={parent.id}>
               <TodoItem todo={parent} indent={0} />
             </div>
           ))
         ) : (
           <Typography variant="body2" color="textSecondary" sx={{ ml: 2 }}>
             まだタスクがありません。新しいタスクを作成しましょう！ {/* No tasks yet. Let's create new ones! */}
           </Typography>
         )}
       </Stack>

       <Button title="クリックでログアウト" variant="contained" onClick={signOut} style={{ marginTop: '30px' }}>Sign out</Button> {/* Sign out button */}

       {/* Custom Modal Dialogs */}
       {/* Alert Dialog */}
       <Dialog open={openAlert} onClose={handleCloseAlert}>
         <DialogTitle>お知らせ</DialogTitle> {/* Notice */}
         <DialogContent><Typography>{alertMessage}</Typography></DialogContent>
         <DialogActions><Button onClick={handleCloseAlert}>OK</Button></DialogActions>
       </Dialog>
       {/* Confirm Dialog */}
       <Dialog open={openConfirm} onClose={handleCancelConfirm}>
         <DialogTitle>確認</DialogTitle> {/* Confirmation */}
         <DialogContent><Typography whiteSpace="pre-wrap">{confirmMessage}</Typography></DialogContent>
         <DialogActions>
           <Button onClick={handleCancelConfirm}>キャンセル</Button> {/* Cancel */}
           <Button onClick={handleConfirm} autoFocus>OK</Button>
         </DialogActions>
       </Dialog>
       {/* Prompt Dialog */}
       <Dialog open={openPrompt} onClose={handlePromptCancel}>
         <DialogTitle>入力</DialogTitle> {/* Input */}
         <DialogContent>
           <Typography>{promptMessage}</Typography>
           <TextField
             autoFocus margin="dense" id="prompt-input" label="内容" type="text" fullWidth // Content
             variant="standard" value={promptInput} onChange={(e) => setPromptInput(e.target.value)}
             onKeyPress={(e) => { if (e.key === 'Enter') { handlePromptSubmit(); } }}
           />
         </DialogContent>
         <DialogActions>
           <Button onClick={handlePromptCancel}>キャンセル</Button> {/* Cancel */}
           <Button onClick={handlePromptSubmit}>OK</Button>
         </DialogActions>
       </Dialog>
     </main>
   );
 }

 export default App;