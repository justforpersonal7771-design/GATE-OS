export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: "Low" | "Medium" | "High";
  createdAt: string;
}
