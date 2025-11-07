export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export type MoodBoardItem =
  | {
      id: string;
      type: 'design';
      imageUrl: string;
      style: string;
    }
  | {
      id: string;
      type: 'item';
      name: string;
      url: string;
      description: string;
    };
