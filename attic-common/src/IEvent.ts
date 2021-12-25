
export interface IEvent<T> {
  type: string;
  createdAt: Date;
  subject?: T;
  description?: string;
  meta?: { [name: string]: any };
}

export default IEvent;
