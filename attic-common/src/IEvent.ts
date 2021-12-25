
export interface IEvent<T> {
  _id: string,
  type: string;
  createdAt: Date;
  subject?: T;
  description?: string;
  meta?: { [name: string]: any };
}

export default IEvent;
